package org.fulib.projects;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class Service
{
	private static final String STOP_URL = System.getenv("STOP_URL");

	private ScheduledExecutorService scheduler;

	private spark.Service service;

	private volatile ScheduledFuture<?> scheduledStop;

	public static void main(String[] args)
	{
		new Service().run();
	}

	private void run()
	{
		scheduler = Executors.newSingleThreadScheduledExecutor();
		scheduledStop = scheduler.schedule(this::stop, 120, TimeUnit.SECONDS);

		final WebSocketHandler webSocketHandler = new WebSocketHandler(() -> {
			scheduledStop.cancel(false);
			scheduledStop = scheduler.schedule(this::stop, 60, TimeUnit.SECONDS);
		});

		final FileWatcherProcess fileWatcher = new FileWatcherProcess(webSocketHandler);
		fileWatcher.setDaemon(true);
		fileWatcher.start();

		service = spark.Service.ignite();
		service.port(4567);
		service.webSocket("/ws", webSocketHandler);
		service.init();
		service.awaitStop();
	}

	private void stop()
	{
		sendStopRequest();

		service.stop();
		scheduler.shutdown();
	}

	private void sendStopRequest()
	{
		try
		{
			final URL url = new URL(STOP_URL);
			final HttpURLConnection httpCon = (HttpURLConnection) url.openConnection();
			httpCon.setRequestMethod("DELETE");
			httpCon.connect();
			httpCon.disconnect();
		}
		catch (IOException exception)
		{
			exception.printStackTrace();
		}
	}
}
