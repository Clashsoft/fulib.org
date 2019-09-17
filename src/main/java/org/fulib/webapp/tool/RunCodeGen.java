package org.fulib.webapp.tool;

import org.fulib.StrUtil;
import org.fulib.webapp.mongo.Mongo;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import spark.Request;
import spark.Response;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.logging.Logger;

public class RunCodeGen
{
	private static final String TEMP_DIR_PREFIX    = "fulibScenarios";

	public static String handle(Request req, Response res) throws Exception
	{
		final Path codegendir = Files.createTempDirectory(TEMP_DIR_PREFIX);
		final Path srcDir = codegendir.resolve("src");
		final Path modelSrcDir = codegendir.resolve("model_src");
		final Path testSrcDir = codegendir.resolve("test_src");
		final Path modelClassesDir = codegendir.resolve("model_classes");
		final Path testClassesDir = codegendir.resolve("test_classes");

		try
		{
			final String body = req.body();
			final JSONObject jsonObject = new JSONObject(body);
			final String bodyText = jsonObject.getString("scenarioText");
			final String packageName = jsonObject.getString("packageName");
			final String packageDir = packageName.replace('.', '/');
			final String scenarioFileName = jsonObject.getString("scenarioFileName");
			final Path packagePath = srcDir.resolve(packageDir);

			// create source directory and write source scenario file
			Files.createDirectories(packagePath);
			Files.write(packagePath.resolve(scenarioFileName), bodyText.getBytes(StandardCharsets.UTF_8));

			// create output directories
			Files.createDirectories(modelSrcDir);
			Files.createDirectories(testSrcDir);

			final ByteArrayOutputStream out = new ByteArrayOutputStream();

			// invoke scenario compiler
			final int exitCode = Tools.genCompileRun(out, out, srcDir, modelSrcDir, testSrcDir, modelClassesDir,
			                                         testClassesDir, "--class-diagram-svg", "--object-diagram-svg");

			final JSONObject result = new JSONObject();

			result.put("exitCode", exitCode);

			final String output = new String(out.toByteArray(), StandardCharsets.UTF_8);
			result.put("output", output.replace(codegendir.toString(), "."));

			if (exitCode < 0) // exception occurred
			{
				Logger.getGlobal().severe(output);
			}

			if (exitCode == 0 || (exitCode & 4) != 0) // scenarioc did not fail
			{
				// collect test methods
				final JSONArray methodArray = new JSONArray();

				Files.walk(testSrcDir).filter(Tools::isJava).forEach(file -> readTestMethods(methodArray, file));

				Files.walk(modelSrcDir).filter(Tools::isJava).sorted()
				     .forEach(file -> readModelMethods(methodArray, file));

				result.put("testMethods", methodArray);

				// read class diagram
				final Path classDiagramFile = modelSrcDir.resolve(packageDir).resolve("classDiagram.svg");
				if (Files.exists(classDiagramFile))
				{
					final byte[] bytes = Files.readAllBytes(classDiagramFile);
					final String svgText = new String(bytes, StandardCharsets.UTF_8);
					result.put("classDiagram", svgText);
				}

				final JSONArray objectDiagrams = collectObjectDiagrams(bodyText, packagePath);
				result.put("objectDiagrams", objectDiagrams);
			}

			res.type("application/json");

			final String resultBody = result.toString(3);

			if (jsonObject.has("privacy") && "all".equals(jsonObject.get("privacy")))
			{
				Mongo.get().log(req.ip(), req.userAgent(), body, resultBody);
			}
			return resultBody;
		}
		finally
		{
			Tools.deleteRecursively(codegendir);
		}
	}

	private static JSONArray collectObjectDiagrams(String scenarioText, Path packagePath) throws IOException
	{
		final JSONArray objectDiagrams = new JSONArray();

		// sorting is O(n log n) with n = number of object diagrams,
		// while a comparison takes O(m) steps to search for the occurrence in the text of length m.
		// thus, we use a cache for the index of occurrence to avoid excessive searching during sort.
		final Map<Path, Integer> diagramOccurrenceMap = new HashMap<>();

		Files.walk(packagePath).filter(file -> {
			final String fileName = file.toString();
			return fileName.endsWith(".svg") || fileName.endsWith(".png") //
			       || fileName.endsWith(".yaml") || fileName.endsWith(".html") || fileName.endsWith(".txt");
		}).sorted(Comparator.comparingInt(path -> {
			final Integer cached = diagramOccurrenceMap.get(path);
			if (cached != null)
			{
				return cached;
			}

			final String fileName = packagePath.relativize(path).toString();
			int index = scenarioText.indexOf(fileName);
			if (index < 0)
			{
				// the file generated by --object-diagram-svg is not named in the scenario text,
				// but should sort last
				index = Integer.MAX_VALUE;
			}

			diagramOccurrenceMap.put(path, index);
			return index;
		})).forEach(file -> {
			final String relativeName = packagePath.relativize(file).toString();
			addObjectDiagram(objectDiagrams, file, relativeName);
		});
		return objectDiagrams;
	}

	private static void addObjectDiagram(JSONArray objectDiagrams, Path file, String fileName)
	{
		try
		{
			tryAddObjectDiagram(objectDiagrams, file, fileName);
		}
		catch (Exception e)
		{
			throw new RuntimeException(e);
		}
	}

	private static void tryAddObjectDiagram(JSONArray objectDiagrams, Path file, String fileName)
		throws JSONException, IOException
	{
		final byte[] content = Files.readAllBytes(file);

		final JSONObject object = new JSONObject();
		object.put("name", fileName);

		switch (fileName.substring(fileName.lastIndexOf('.')))
		{
		case ".png":
			final String base64Content = Base64.getEncoder().encodeToString(content);
			object.put("content", base64Content);
			break;
		case ".yaml":
		case ".svg":
		case ".html":
		case ".txt":
			object.put("content", new String(content, StandardCharsets.UTF_8));
			break;
		}

		objectDiagrams.put(object);
	}

	private static void readTestMethods(JSONArray methodArray, Path file)
	{
		try
		{
			tryReadTestMethods(methodArray, file);
		}
		catch (Exception e)
		{
			throw new RuntimeException(e);
		}
	}

	private static void tryReadTestMethods(JSONArray methodArray, Path file) throws IOException, JSONException
	{
		tryReadMethods(methodArray, file, false);
	}

	private static void readModelMethods(JSONArray methodArray, Path file)
	{
		try
		{
			tryReadModelMethod(methodArray, file);
		}
		catch (Exception e)
		{
			throw new RuntimeException(e);
		}
	}

	private static void tryReadModelMethod(JSONArray methodArray, Path file) throws IOException, JSONException
	{
		tryReadMethods(methodArray, file, true);
	}

	private static void tryReadMethods(JSONArray methodArray, Path file, boolean modelFilter)
		throws IOException, JSONException
	{
		final Set<String> properties = modelFilter ? new HashSet<>() : null;
		final List<String> lines = Files.readAllLines(file);
		String methodName = null;
		StringBuilder methodBody = null;

		for (String line : lines)
		{
			int end;
			if (modelFilter && line.startsWith("   public static final String PROPERTY_")
			    && (end = line.lastIndexOf(" = ")) >= 0)
			{
				properties.add(line.substring("   public static final String PROPERTY_".length(), end));
			}
			if (line.startsWith("   public ") && (end = line.lastIndexOf(')')) >= 0 && line.lastIndexOf('=') <= 0)
			{
				final String decl = line.substring("   public ".length(), end + 1);
				if (!modelFilter || !shouldSkip(decl, properties))
				{
					methodName = decl;
					methodBody = new StringBuilder();
				}
			}
			else if (methodName != null && "   }".equals(line))
			{
				final JSONObject method = new JSONObject();
				method.put("name", methodName);
				method.put("body", methodBody.toString());
				methodArray.put(method);

				methodName = null;
				methodBody = null;
			}
			else if (methodName != null && line.startsWith("      "))
			{
				methodBody.append(line, 6, line.length()).append("\n");
			}
		}
	}

	static final Set<String> DEFAULT_METHODS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
		"firePropertyChange", "addPropertyChangeListener", "removePropertyChangeListener", "removeYou", "toString")));

	// must be sorted by longest first
	static final String[] DEFAULT_PROPERTY_METHODS = { "without", "with", "get", "set" };

	static boolean shouldSkip(String decl, Set<String> properties)
	{
		final int end = decl.indexOf('(');
		final int start = decl.lastIndexOf(' ', end) + 1;
		final String methodName = decl.substring(start, end);

		if (DEFAULT_METHODS.contains(methodName))
		{
			return true;
		}

		for (final String propertyMethod : DEFAULT_PROPERTY_METHODS)
		{
			if (methodName.startsWith(propertyMethod))
			{
				final String propertyName = StrUtil.downFirstChar(methodName.substring(propertyMethod.length()));
				return properties.contains(propertyName);
			}
		}

		return false;
	}
}
