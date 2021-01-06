package org.fulib.projects;

import org.eclipse.jetty.websocket.api.Session;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.UUID;

public class ExecProcess extends Thread
{
	private final String[] cmd;
	private final Session session;
	private final String execId;

	private Process process;

	public ExecProcess(String[] cmd, Session session)
	{
		this.cmd = cmd;
		this.session = session;
		this.execId = UUID.randomUUID().toString();
	}

	public String getExecId()
	{
		return execId;
	}

	public OutputStream getOutputStream()
	{
		return this.process.getOutputStream();
	}

	@Override
	public void run()
	{
		try
		{
			final ProcessBuilder processBuilder = new ProcessBuilder(cmd);
			processBuilder.redirectErrorStream(true);
			process = processBuilder.start();

			final JSONObject startedEvent = new JSONObject();
			startedEvent.put("event", "started");
			startedEvent.put("process", execId);
			session.getRemote().sendString(startedEvent.toString());

			try (final InputStream input = process.getInputStream())
			{
				byte[] buf = new byte[4096];
				int read;
				while ((read = input.read(buf)) >= 0)
				{
					if (read <= 0)
					{
						continue;
					}

					final JSONObject outputEvent = new JSONObject();
					outputEvent.put("event", "output");
					outputEvent.put("process", execId);
					outputEvent.put("text", new String(buf, 0, read));
					session.getRemote().sendString(outputEvent.toString());
				}
			}

			final int returnCode = process.waitFor();

			final JSONObject exitedEvent = new JSONObject();
			exitedEvent.put("event", "exited");
			exitedEvent.put("process", execId);
			exitedEvent.put("exitCode", returnCode);
			session.getRemote().sendString(exitedEvent.toString());
		}
		catch (IOException | InterruptedException exception)
		{
			exception.printStackTrace();
		}
	}
}
