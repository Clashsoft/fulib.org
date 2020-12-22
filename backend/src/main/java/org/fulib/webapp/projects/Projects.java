package org.fulib.webapp.projects;

import org.apache.commons.io.output.WriterOutputStream;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.UpgradeRequest;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketConnect;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;
import org.fulib.webapp.mongo.Mongo;
import org.fulib.webapp.projects.model.File;
import org.fulib.webapp.projects.model.Project;
import org.fulib.webapp.projectzip.ProjectData;
import org.fulib.webapp.projectzip.ProjectGenerator;
import org.fulib.webapp.tool.Authenticator;
import org.fulib.webapp.tool.IDGenerator;
import org.json.JSONArray;
import org.json.JSONObject;
import spark.Request;
import spark.Response;
import spark.Spark;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@WebSocket
public class Projects
{
	private static final String AUTH_MESSAGE = "{\n  \"error\": \"token user ID does not match ID of project\"\n}\n";

	private final Mongo mongo;

	public Projects(Mongo mongo)
	{
		this.mongo = mongo;
	}

	public Object get(Request request, Response response)
	{
		final String id = request.params("projectId");

		final Project project = getOr404(this.mongo, id);
		checkAuth(request, project);

		final JSONObject json = this.toJson(project);
		return json.toString(2);
	}

	static void checkAuth(Request request, Project project)
	{
		final String userId = Authenticator.getUserIdOr401(request);
		if (!userId.equals(project.getUserId()))
		{
			throw Spark.halt(401, AUTH_MESSAGE);
		}
	}

	static Project getOr404(Mongo mongo, String id)
	{
		final Project project = mongo.getProject(id);
		if (project == null)
		{
			throw Spark.halt(404, notFoundMessage(id));
		}
		return project;
	}

	private static String notFoundMessage(String id)
	{
		return String.format("{\n  \"error\": \"project with id '%s' not found\"\n}\n", id);
	}

	public Object getAll(Request request, Response response)
	{
		final String userId = Authenticator.getAndCheckUserIdQueryParam(request);

		final List<Project> projects = this.mongo.getProjectsByUser(userId);
		final JSONArray array = new JSONArray();
		for (final Project project : projects)
		{
			array.put(toJson(project));
		}
		return array.toString(2);
	}

	private JSONObject toJson(Project project)
	{
		final JSONObject obj = new JSONObject();
		obj.put(Project.PROPERTY_ID, project.getId());
		obj.put(Project.PROPERTY_USER_ID, project.getUserId());
		obj.put(Project.PROPERTY_NAME, project.getName());
		obj.put(Project.PROPERTY_DESCRIPTION, project.getDescription());
		obj.put(Project.PROPERTY_CREATED, project.getCreated().toString());
		obj.put(Project.PROPERTY_ROOT_FILE_ID, project.getRootFileId());
		return obj;
	}

	public Object create(Request request, Response response) throws IOException
	{
		final String id = IDGenerator.generateID();
		final Project project = new Project(id);
		this.readJson(new JSONObject(request.body()), project);

		final Instant now = Instant.now();
		project.setCreated(now);

		final String userId = Authenticator.getUserIdOr401(request);
		project.setUserId(userId);

		final String rootFileId = this.generateProjectFiles(project);
		project.setRootFileId(rootFileId);

		this.mongo.saveProject(project);

		JSONObject responseJson = toJson(project);

		return responseJson.toString(2);
	}

	private void readJson(JSONObject obj, Project project)
	{
		project.setName(obj.getString(Project.PROPERTY_NAME));
		project.setDescription(obj.getString(Project.PROPERTY_DESCRIPTION));
	}

	private String generateProjectFiles(Project project) throws IOException
	{
		final File rootDir = new File(IDGenerator.generateID());
		rootDir.setName(".");
		rootDir.setDirectory(true);
		rootDir.setCreated(project.getCreated());
		rootDir.setProjectId(project.getId());
		rootDir.setUserId(project.getUserId());

		final FileResolver resolver = new FileResolver(rootDir);

		final List<File> newFiles = new ArrayList<>();
		newFiles.add(rootDir);

		final ProjectData projectData = getProjectData(project);
		new ProjectGenerator().generate(projectData, (name, output) -> {
			final File file = resolver.getOrCreate(name);
			try (OutputStream upload = this.mongo.uploadRevision(file.getId()))
			{
				output.accept(upload);
			}
		});

		newFiles.addAll(resolver.getFiles());

		this.mongo.createManyFiles(newFiles);

		return rootDir.getId();
	}

	private ProjectData getProjectData(Project project)
	{
		final ProjectData projectData = new ProjectData();
		projectData.setPackageName("org.example");
		projectData.setScenarioFileName("Example.md");
		projectData.setScenarioText("# My First Project\n\nThere is an Example with text Hello World.\n");
		projectData.setProjectName(project.getName().replaceAll("\\W+", "-"));
		projectData.setProjectVersion("0.1.0");
		projectData.setDecoratorClassName("GenModel");
		return projectData;
	}

	public Object update(Request request, Response response)
	{
		final String id = request.params("projectId");
		final Project project = getOr404(this.mongo, id);
		checkAuth(request, project);

		this.readJson(new JSONObject(request.body()), project);

		this.mongo.saveProject(project);

		final JSONObject json = this.toJson(project);
		return json.toString(2);
	}

	public Object delete(Request request, Response response)
	{
		final String id = request.params("projectId");
		final Project project = getOr404(this.mongo, id);
		checkAuth(request, project);

		this.mongo.deleteProject(id);

		return "{}";
	}

	private Map<Session, Executor> executors = new ConcurrentHashMap<>();
	private Map<Session, PipedOutputStream> inputPipes = new ConcurrentHashMap<>();

	@OnWebSocketConnect
	public void connected(Session session) throws IOException
	{
		final UpgradeRequest request = session.getUpgradeRequest();
		final String requestPath = request.getRequestURI().getPath();
		if (!requestPath.startsWith("/ws/projects/"))
		{
			session.close(400, "{\"error\": \"URL path must have the format '/ws/projects/:id'\"}");
			return;
		}

		final String projectId = requestPath.substring("/ws/projects/".length());
		final Project project = this.mongo.getProject(projectId);
		if (project == null)
		{
			session.close(404, notFoundMessage(projectId));
			return;
		}

		final List<String> token = request.getParameterMap().get("token");
		if (token == null || token.isEmpty())
		{
			session.close(400, "{\"error\": \"missing token query parameter\"}");
			return;
		}

		final String authHeader = "bearer " + token.get(0);
		final String userId = Authenticator.getUserId(authHeader);
		if (!project.getUserId().equals(userId))
		{
			session.close(401, AUTH_MESSAGE);
			return;
		}

		final PipedOutputStream inputPipe = new PipedOutputStream();
		final InputStream input = new PipedInputStream(inputPipe);
		final OutputStream output = new WriterOutputStream(new Writer()
		{
			@Override
			public void write(char[] cbuf, int off, int len) throws IOException
			{
				final JSONObject message = new JSONObject();
				message.put("output", new String(cbuf, off, len));
				session.getRemote().sendString(message.toString());
			}

			@Override
			public void flush()
			{
			}

			@Override
			public void close()
			{
			}
		}, StandardCharsets.UTF_8, 1024, true);

		final Executor executor = new Executor(this.mongo, project, input, output);

		this.inputPipes.put(session, inputPipe);
		this.executors.put(session, executor);

		executor.start();
	}

	@OnWebSocketMessage
	public void message(Session session, String message) throws IOException
	{
		final OutputStream pipedOutputStream = this.inputPipes.get(session);
		if (pipedOutputStream == null)
		{
			return;
		}

		final JSONObject json = new JSONObject(message);
		final String input = json.getString("input");
		pipedOutputStream.write(input.getBytes(StandardCharsets.UTF_8));
	}

	@OnWebSocketClose
	public void closed(Session session, int statusCode, String reason)
	{
		this.inputPipes.remove(session);
		final Executor executor = this.executors.remove(session);
		if (executor != null)
		{
			executor.interrupt();
		}
	}
}
