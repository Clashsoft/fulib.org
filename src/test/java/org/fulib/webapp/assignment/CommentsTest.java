package org.fulib.webapp.assignment;

import org.fulib.webapp.assignment.model.Assignment;
import org.fulib.webapp.assignment.model.Comment;
import org.fulib.webapp.assignment.model.Solution;
import org.fulib.webapp.mongo.Mongo;
import org.json.JSONObject;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import spark.HaltException;
import spark.Request;
import spark.Response;

import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.notNullValue;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.Assert.fail;
import static org.mockito.Mockito.*;

public class CommentsTest
{
	private static final String SOLUTION_ID = "s1";
	private static final String SOLUTION_TOKEN = "s123";
	private static final String ASSIGNMENT_ID = "a1";
	private static final String ASSIGNMENT_TOKEN = "a123";
	private static final String AUTHOR = "Testus";
	private static final String EMAIL = "test@example.org";
	private static final String BODY = "Hello there";
	private static final String BODY_HTML = "<p>Hello there</p>\n";

	@Test
	public void post404()
	{
		final Mongo db = mock(Mongo.class);
		final Comments comments = new Comments(db);
		final Request request = mock(Request.class);
		final Response response = mock(Response.class);

		when(request.params("solutionID")).thenReturn("-1");
		when(db.getSolution("-1")).thenReturn(null);

		try
		{
			comments.post(request, response);
			fail("did not throw HaltException");
		}
		catch (HaltException ex)
		{
			assertThat(ex.statusCode(), equalTo(404));
			final JSONObject body = new JSONObject(ex.body());
			assertThat(body.getString("error"), equalTo("solution with id '-1'' not found")); // TODO '
		}
	}

	@Test
	public void postWithoutToken()
	{
		final Mongo db = mock(Mongo.class);
		final Comments comments = new Comments(db);
		final Request request = mock(Request.class);
		final Response response = mock(Response.class);

		final Solution solution = createExampleSolution();

		when(request.params("solutionID")).thenReturn(SOLUTION_ID);
		when(db.getSolution(SOLUTION_ID)).thenReturn(solution);

		checkInvalidToken(comments, request, response);
	}

	@Test
	public void postWithWrongSolutionToken()
	{
		final Mongo db = mock(Mongo.class);
		final Comments comments = new Comments(db);
		final Request request = mock(Request.class);
		final Response response = mock(Response.class);

		final Solution solution = createExampleSolution();

		when(request.params("solutionID")).thenReturn(SOLUTION_ID);
		when(request.headers("Solution-Token")).thenReturn("s456");
		when(db.getSolution(SOLUTION_ID)).thenReturn(solution);

		checkInvalidToken(comments, request, response);
	}

	@Test
	public void postWithWrongAssignmentToken()
	{
		final Mongo db = mock(Mongo.class);
		final Comments comments = new Comments(db);
		final Request request = mock(Request.class);
		final Response response = mock(Response.class);

		final Solution solution = createExampleSolution();

		when(request.params("solutionID")).thenReturn(SOLUTION_ID);
		when(request.headers("Assignment-Token")).thenReturn("a456");
		when(db.getSolution(SOLUTION_ID)).thenReturn(solution);

		checkInvalidToken(comments, request, response);
	}

	private void checkInvalidToken(Comments comments, Request request, Response response)
	{
		try
		{
			comments.post(request, response);
			fail("did not throw HaltException");
		}
		catch (HaltException ex)
		{
			assertThat(ex.statusCode(), equalTo(401));
			final JSONObject body = new JSONObject(ex.body());
			assertThat(body.getString("error"), equalTo("invalid Assignment-Token or Solution-Token"));
		}
	}

	private Solution createExampleSolution()
	{
		final Assignment assignment = new Assignment(ASSIGNMENT_ID);
		assignment.setToken(ASSIGNMENT_TOKEN);

		final Solution solution = new Solution(SOLUTION_ID);
		solution.setAssignment(assignment);
		solution.setToken(SOLUTION_TOKEN);
		return solution;
	}

	@Test
	public void postWithSolutionToken()
	{
		final Mongo db = mock(Mongo.class);
		final Comments comments = new Comments(db);
		final Request request = mock(Request.class);
		final Response response = mock(Response.class);

		final Solution solution = createExampleSolution();

		final JSONObject requestObj = new JSONObject();
		requestObj.put("author", AUTHOR);
		requestObj.put("email", EMAIL);
		requestObj.put("markdown", BODY);

		when(request.params("solutionID")).thenReturn(SOLUTION_ID);
		when(request.headers("Solution-Token")).thenReturn(SOLUTION_TOKEN);
		when(request.body()).thenReturn(requestObj.toString());
		when(db.getSolution(SOLUTION_ID)).thenReturn(solution);

		final String responseBody = (String) comments.post(request, response);

		final JSONObject responseObj = new JSONObject(responseBody);
		assertThat(responseObj.getString("id"), notNullValue());
		assertThat(responseObj.getString("timeStamp"), notNullValue());
		assertThat(responseObj.getString("html"), equalTo(BODY_HTML));
		assertThat(responseObj.getBoolean("distinguished"), equalTo(false));

		final ArgumentCaptor<Comment> commentCaptor = ArgumentCaptor.forClass(Comment.class);
		verify(db).saveComment(commentCaptor.capture());

		final Comment comment = commentCaptor.getValue();
		assertThat(comment.getID(), notNullValue());
		assertThat(comment.getTimeStamp(), notNullValue());
		assertThat(comment.getParent(), equalTo(SOLUTION_ID));
		assertThat(comment.getAuthor(), equalTo(AUTHOR));
		assertThat(comment.getEmail(), equalTo(EMAIL));
		assertThat(comment.getMarkdown(), equalTo(BODY));
		assertThat(comment.getHtml(), equalTo(BODY_HTML));
		assertThat(comment.isDistinguished(), equalTo(false));
	}
}
