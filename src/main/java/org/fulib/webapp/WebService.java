package org.fulib.webapp;

import org.fulib.webapp.assignment.Assignments;
import org.fulib.webapp.assignment.Comments;
import org.fulib.webapp.assignment.Courses;
import org.fulib.webapp.assignment.Solutions;
import org.fulib.webapp.mongo.Mongo;
import org.fulib.webapp.projectzip.ProjectZip;
import org.fulib.webapp.tool.MarkdownUtil;
import org.fulib.webapp.tool.RunCodeGen;
import spark.Request;
import spark.Response;
import spark.Service;

import java.io.File;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

public class WebService
{
	// =============== Static Fields ===============

	public static final String VERSION;
	public static final String FULIB_SCENARIOS_VERSION;
	public static final String FULIB_MOCKUPS_VERSION;

	static
	{
		final Properties props = new Properties();
		try
		{
			props.load(WebService.class.getResourceAsStream("version.properties"));
		}
		catch (Exception e)
		{
			Logger.getGlobal().throwing("WebService", "static init", e);
		}

		VERSION = props.getProperty("webapp.version");
		FULIB_SCENARIOS_VERSION = props.getProperty("fulibScenarios.version");
		FULIB_MOCKUPS_VERSION = props.getProperty("fulibMockups.version");
	}

	public static final String PASSWORD_ENV_KEY = "FULIB_ORG_MONGODB_PASSWORD";
	public static final String HOST_ENV_KEY = "FULIB_ORG_MONGODB_HOST";
	public static final String USER_ENV_KEY = "FULIB_ORG_MONGODB_USER";

	// =============== Fields ===============

	private Service service;
	private final RunCodeGen runCodeGen;
	private final ProjectZip projectZip;
	private final Assignments assignments;
	private final Comments comments;
	private final Solutions solutions;
	private final Courses courses;

	// =============== Constructors ===============

	public WebService()
	{
		this(new Mongo(getMongoURL()));
	}

	WebService(Mongo db)
	{
		this(new RunCodeGen(db), new ProjectZip(db), new Assignments(db), new Comments(db), new Solutions(db),
		     new Courses(db));
	}

	WebService(RunCodeGen runCodeGen, ProjectZip projectZip, Assignments assignments, Comments comments,
		Solutions solutions, Courses courses)
	{
		this.runCodeGen = runCodeGen;
		this.projectZip = projectZip;
		this.assignments = assignments;
		this.comments = comments;
		this.solutions = solutions;
		this.courses = courses;
	}

	// =============== Static Methods ===============

	public static void main(String[] args)
	{
		new WebService().start();
	}

	// =============== Methods ===============

	public void start()
	{
		service = Service.ignite();
		service.port(4567);

		service.staticFiles.location("/org/fulib/webapp/static");

		if (isDevEnv())
		{
			enableCORS();
		}

		setupRedirects();

		addMainRoutes();
		addAssignmentsRoutes();
		addCoursesRoutes();
		addUtilRoutes();

		service.notFound(WebService::serveIndex);

		setupExceptionHandler();

		Logger.getGlobal().info("scenario server started on http://localhost:4567");
	}

	// --------------- Helpers ---------------

	public static String getMongoURL()
	{
		final String host = System.getenv(HOST_ENV_KEY);
		if (host == null || host.isEmpty())
		{
			return null;
		}

		final String user = System.getenv(USER_ENV_KEY);
		if (user == null || user.isEmpty())
		{
			return null;
		}

		final String password = System.getenv(PASSWORD_ENV_KEY);
		if (password == null || password.isEmpty())
		{
			return null;
		}

		return "mongodb://" + user + ":" + password + "@" + host;
	}

	private boolean isDevEnv()
	{
		return new File("build.gradle").exists();
	}

	private void setupRedirects()
	{
		service.redirect.get("/github", "https://github.com/fujaba/fulib.org");
	}

	private void addMainRoutes()
	{
		service.post("/runcodegen", runCodeGen::handle);
		service.post("/projectzip", projectZip::handle);
	}

	private void addUtilRoutes()
	{
		service.post("/rendermarkdown", (request, response) -> {
			response.type("text/html");
			return MarkdownUtil.renderHtml(request.body());
		});
	}

	private void addCoursesRoutes()
	{
		service.path("/courses", () -> {
			service.post("", courses::create);
			service.get("/:courseID", courses::get);
		});
	}

	private void setupExceptionHandler()
	{
		service.exception(Exception.class, (exception, request, response) -> {
			Logger.getGlobal().log(Level.SEVERE, "unhandled exception processing request", exception);
		});
	}

	private void addAssignmentsRoutes()
	{
		service.path("/assignments", () -> {
			service.post("", assignments::create);

			service.post("/create/check", solutions::check);

			service.path("/:assignmentID", this::addAssignmentRoutes);
		});
	}

	private void addAssignmentRoutes()
	{
		service.get("", assignments::get);

		service.post("/check", solutions::check);

		addSolutionsRoutes();
	}

	private void addSolutionsRoutes()
	{
		service.path("/solutions", () -> {
			service.post("", solutions::create);
			service.get("", solutions::getAll);

			service.path("/:solutionID", this::addSolutionRoutes);
		});
	}

	private void addSolutionRoutes()
	{
		service.get("", solutions::get);

		service.path("/assignee", () -> {
			service.get("", solutions::getAssignee);
			service.put("", solutions::setAssignee);
		});

		service.path("/gradings", () -> {
			service.post("", solutions::postGrading);
			service.get("", solutions::getGradings);
		});

		service.path("/comments", () -> {
			service.post("", comments::post);
			service.get("", comments::getChildren);
		});
	}

	private void enableCORS()
	{
		service.staticFiles.header("Access-Control-Allow-Origin", "*");

		service.before((request, response) -> response.header("Access-Control-Allow-Origin", "*"));

		service.options("/*", (req, res) -> {
			String accessControlRequestHeaders = req.headers("Access-Control-Request-Headers");
			if (accessControlRequestHeaders != null)
			{
				res.header("Access-Control-Allow-Headers", accessControlRequestHeaders);
			}

			String accessControlRequestMethod = req.headers("Access-Control-Request-Method");
			if (accessControlRequestMethod != null)
			{
				res.header("Access-Control-Allow-Methods", accessControlRequestMethod);
			}

			return "OK";
		});
	}

	public static Object serveIndex(Request req, Response res)
	{
		return WebService.class.getResourceAsStream("static/index.html");
	}
}
