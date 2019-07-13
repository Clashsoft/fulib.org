package org.fulib.scenarios.tool;

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
	private static final String PACKAGE_NAME       = "webapp";
	private static final String SCENARIO_FILE_NAME = "scenario.md";

	public static String handle(Request req, Response res) throws Exception
	{
		final Path codegendir = Files.createTempDirectory(TEMP_DIR_PREFIX);
		final Path srcDir = codegendir.resolve("src");
		final Path mainPackageDir = srcDir.resolve(PACKAGE_NAME);
		final Path modelSrcDir = codegendir.resolve("model_src");
		final Path testSrcDir = codegendir.resolve("test_src");
		final Path scenarioFile = mainPackageDir.resolve(SCENARIO_FILE_NAME);
		final Path modelClassesDir = codegendir.resolve("model_classes");
		final Path testClassesDir = codegendir.resolve("test_classes");

		try
		{
			final String body = req.body();
			final JSONObject jsonObject = new JSONObject(body);
			final String bodyText = jsonObject.getString("scenarioText");

			// create source directory and write source scenario file
			Files.createDirectories(srcDir);
			Files.createDirectories(mainPackageDir);
			Files.write(scenarioFile, bodyText.getBytes(StandardCharsets.UTF_8));

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

				Files.walk(testSrcDir).filter(Tools::isJava).forEach(file -> readTestMethod(methodArray, file));

				result.put("testMethods", methodArray);

				// read class diagram
				final Path classDiagramFile = modelSrcDir.resolve(PACKAGE_NAME).resolve("classDiagram.svg");
				if (Files.exists(classDiagramFile))
				{
					final byte[] bytes = Files.readAllBytes(classDiagramFile);
					final String svgText = new String(bytes, StandardCharsets.UTF_8);
					result.put("classDiagram", svgText);
				}

				final JSONArray objectDiagrams = collectObjectDiagrams(bodyText, srcDir);
				result.put("objectDiagrams", objectDiagrams);
			}

			res.type("application/json");
			return result.toString(3);
		}
		finally
		{
			Tools.deleteRecursively(codegendir);
		}
	}

	private static JSONArray collectObjectDiagrams(String scenarioText, Path srcDir) throws IOException
	{
		final JSONArray objectDiagrams = new JSONArray();
		final Path srcPackage = srcDir.resolve(PACKAGE_NAME);

		// sorting is O(n log n) with n = number of object diagrams,
		// while a comparison takes O(m) steps to search for the occurrence in the text of length m.
		// thus, we use a cache for the index of occurrence to avoid excessive searching during sort.
		final Map<Path, Integer> diagramOccurrenceMap = new HashMap<>();

		Files.walk(srcPackage).filter(file -> {
			final String fileName = file.toString();
			return fileName.endsWith(".svg") || fileName.endsWith(".png") //
			       || fileName.endsWith(".yaml") || fileName.endsWith(".html")
					 || fileName.endsWith(".txt");
		}).sorted(Comparator.comparingInt(path -> {
			final Integer cached = diagramOccurrenceMap.get(path);
			if (cached != null)
			{
				return cached;
			}

			final String fileName = srcPackage.relativize(path).toString();
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
			final String relativeName = srcPackage.relativize(file).toString();
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

	private static void readTestMethod(JSONArray methodArray, Path file)
	{
		try
		{
			tryReadTestMethod(methodArray, file);
		}
		catch (Exception e)
		{
			throw new RuntimeException(e);
		}
	}

	private static void tryReadTestMethod(JSONArray methodArray, Path file) throws IOException, JSONException
	{
		final List<String> lines = Files.readAllLines(file);
		String methodName = null;
		StringBuilder methodBody = null;

		for (String line : lines)
		{
			final int end;
			if (line.startsWith("   public ") && (end = line.indexOf(')')) >= 0)
			{
				methodName = line.substring("   public ".length(), end + 1);
				methodBody = new StringBuilder();
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
}
