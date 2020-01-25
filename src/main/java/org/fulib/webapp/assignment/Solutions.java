package org.fulib.webapp.assignment;

import org.fulib.webapp.assignment.model.Assignment;
import org.fulib.webapp.assignment.model.Solution;
import org.fulib.webapp.assignment.model.Task;
import org.fulib.webapp.assignment.model.TaskResult;
import org.fulib.webapp.mongo.Mongo;
import org.fulib.webapp.tool.RunCodeGen;
import org.fulib.webapp.tool.model.CodeGenData;
import org.fulib.webapp.tool.model.Result;
import org.json.JSONArray;
import org.json.JSONObject;
import spark.Request;
import spark.Response;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class Solutions
{
	public static Object create(Request request, Response response)
	{
		final Instant timeStamp = Instant.now();

		final String assignmentID = request.params("assignmentID");
		final Assignment assignment = Mongo.get().getAssignment(assignmentID);

		if (assignment == null)
		{
			response.status(404);
			return unknownAssignmentError(assignmentID);
		}

		final String solutionID = IDGenerator.generateID();
		final String token = IDGenerator.generateToken();

		final Solution solution = fromJson(solutionID, new JSONObject(request.body()));
		solution.setAssignment(assignment);
		solution.setToken(token);
		solution.setTimeStamp(timeStamp);

		Mongo.get().saveSolution(solution);

		final JSONObject result = new JSONObject();
		result.put("id", solutionID);
		result.put("token", token);
		result.put("timeStamp", timeStamp.toString());
		return result.toString(2);
	}

	public static Object check(Request request, Response response) throws Exception
	{
		final String assignmentID = request.params("assignmentID");
		final Assignment assignment = Mongo.get().getAssignment(assignmentID);

		if (assignment == null)
		{
			response.status(404);
			return unknownAssignmentError(assignmentID);
		}

		final JSONObject requestObj = new JSONObject(request.body());
		final String solution = requestObj.getString(Solution.PROPERTY_solution);

		final List<TaskResult> results = runTasks(solution, assignment.getTasks());

		final JSONObject resultObj = new JSONObject();
		final JSONArray tasksArray = new JSONArray();

		int totalPoints = 0;
		for (final TaskResult result : results)
		{
			totalPoints += result.getPoints();

			final JSONObject taskObj = toJson(result);
			tasksArray.put(taskObj);
		}

		resultObj.put("totalPoints", totalPoints);
		resultObj.put("tasks", tasksArray);

		return resultObj.toString(2);
	}

	private static List<TaskResult> runTasks(String solution, List<Task> tasks) throws Exception
	{
		final List<TaskResult> results = new ArrayList<>(tasks.size());
		for (final Task task : tasks)
		{
			final TaskResult result = runTask(solution, task);
			results.add(result);
		}
		return results;
	}

	private static TaskResult runTask(String solution, Task task) throws Exception
	{
		final String scenario =
			"# Solution\n\n" + solution + "\n\n## Verification\n\n" + task.getVerification() + "\n\n";

		final CodeGenData input = new CodeGenData();
		input.setScenarioText(scenario);
		input.setPackageName("assignment");
		input.setScenarioFileName("solution.md");

		// TODO make it ignore diagrams and methods
		final Result result = RunCodeGen.run(input);

		final int points = result.getExitCode() == 0 ? task.getPoints() : 0;
		final TaskResult taskResult = new TaskResult();
		taskResult.setPoints(points);
		taskResult.setOutput(result.getOutput());
		return taskResult;
	}

	private static JSONObject toJson(TaskResult taskResult)
	{
		final JSONObject obj = new JSONObject();
		obj.put(TaskResult.PROPERTY_points, taskResult.getPoints());
		obj.put(TaskResult.PROPERTY_output, taskResult.getOutput());
		return obj;
	}

	private static void writeToFile(String solution, Task task, Path file) throws IOException
	{
		try (final BufferedWriter writer = Files.newBufferedWriter(file))
		{
			writer.write("# Solution\n\n");
			writer.write(solution);
			writer.write("\n\n## Verification");
			writer.write(task.getVerification());
			writer.write("\n\n");
		}
	}

	private static Solution fromJson(String id, JSONObject obj)
	{
		final Solution solution = new Solution(id);
		solution.setName(obj.getString(Solution.PROPERTY_name));
		solution.setStudentID(obj.getString(Solution.PROPERTY_studentID));
		solution.setEmail(obj.getString(Solution.PROPERTY_email));
		solution.setSolution(obj.getString(Solution.PROPERTY_solution));
		// don't include token!
		return solution;
	}

	public static Object get(Request request, Response response)
	{
		final String assignmentID = request.params("assignmentID");
		final String solutionID = request.params("solutionID");

		if (request.contentType() == null || !request.contentType().startsWith("application/json"))
		{
			response.redirect("/assignment/solution.html?id=" + assignmentID + "&solution=" + solutionID);
			return "";
		}

		final Solution solution = Mongo.get().getSolution(solutionID);
		if (solution == null)
		{
			response.status(404);
			return "{}";
		}

		final String solutionToken = solution.getToken();
		final String solutionTokenHeader = request.headers("Solution-Token");

		// NB: we use the assignment resolved via the solution, NOT the one we'd get from assignmentID!
		// Otherwise, someone could create their own assignment, forge the request with that assignment ID
		// and a solutionID belonging to a different assignment, and gain access to the solution without having
		// the token of the assignment it actually belongs to.
		final String assignmentToken = solution.getAssignment().getToken();
		final String assignmentTokenHeader = request.headers("Assignment-Token");

		if (!solutionToken.equals(solutionTokenHeader) && !assignmentToken.equals(assignmentTokenHeader))
		{
			response.status(401);
			// language=JSON
			return "{\n" + "  \"error\": \"invalid token\"\n" + "}\n";
		}

		final JSONObject obj = toJson(solution);
		return obj.toString(2);
	}

	private static JSONObject toJson(Solution solution)
	{
		final JSONObject obj = new JSONObject();

		obj.put(Solution.PROPERTY_id, solution.getID());
		obj.put(Solution.PROPERTY_assignment, solution.getAssignment().getID());
		obj.put(Solution.PROPERTY_name, solution.getName());
		obj.put(Solution.PROPERTY_studentID, solution.getStudentID());
		obj.put(Solution.PROPERTY_email, solution.getEmail());
		obj.put(Solution.PROPERTY_solution, solution.getSolution());
		obj.put(Solution.PROPERTY_timeStamp, solution.getTimeStamp());
		// don't include token!

		return obj;
	}

	public static Object getAll(Request request, Response response)
	{
		final String assignmentID = request.params("assignmentID");

		if (request.contentType() == null || !request.contentType().startsWith("application/json"))
		{
			response.redirect("/assignment/solutions.html?id=" + assignmentID);
			return "";
		}

		final Assignment assignment = Mongo.get().getAssignment(assignmentID);
		if (assignment == null)
		{
			response.status(404);
			return unknownAssignmentError(assignmentID);
		}

		final String token = request.headers("Assignment-Token");

		if (!token.equals(assignment.getToken()))
		{
			response.status(401);
			// language=JSON
			return "{\n" + "  \"error\": \"invalid token\"\n" + "}\n";
		}

		final List<Solution> solutions = Mongo.get().getSolutions(assignmentID);

		final JSONObject result = new JSONObject();

		result.put("count", solutions.size());

		final JSONArray array = new JSONArray();

		for (final Solution solution : solutions)
		{
			array.put(toJson(solution));
		}

		result.put("solutions", array);

		return result.toString(2);
	}

	private static String unknownAssignmentError(String assignmentID)
	{
		// language=JSON
		return "{\n" + "  \"error\": \"assignment with id '" + assignmentID + "'' not found\"\n" + "}";
	}
}
