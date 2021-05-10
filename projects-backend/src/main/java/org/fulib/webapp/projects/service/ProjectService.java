package org.fulib.webapp.projects.service;

import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.fulib.webapp.projects.db.FileRepository;
import org.fulib.webapp.projects.db.ProjectRepository;
import org.fulib.webapp.projects.docker.ContainerManager;
import org.fulib.webapp.projects.model.Container;
import org.fulib.webapp.projects.model.Project;
import org.fulib.webapp.projects.model.ProjectData;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.List;
import java.util.zip.GZIPOutputStream;

public class ProjectService
{
	private final ProjectRepository projectRepository;
	private final FileRepository fileRepository;
	private final ContainerManager containerManager;
	private final ProjectGenerator projectGenerator;

	public ProjectService(ProjectRepository projectRepository, FileRepository fileRepository,
		ContainerManager containerManager, ProjectGenerator projectGenerator)
	{
		this.projectRepository = projectRepository;
		this.fileRepository = fileRepository;
		this.containerManager = containerManager;
		this.projectGenerator = projectGenerator;
	}

	public Project find(String id)
	{
		return this.projectRepository.find(id);
	}

	public List<Project> findByUser(String user)
	{
		return this.projectRepository.findByUser(user);
	}

	public void create(Project project) throws IOException {
		this.generateProjectFiles(project);
		this.projectRepository.save(project);
	}

	private void generateProjectFiles(Project project) throws IOException
	{
		final ProjectData projectData = getProjectData(project);

		try (
			final OutputStream uploadStream = this.fileRepository.upload(project.getId());
			final GZIPOutputStream gzipOutputStream = new GZIPOutputStream(uploadStream);
			final TarArchiveOutputStream tarOutputStream = new TarArchiveOutputStream(gzipOutputStream, "UTF-8")
		)
		{
			final ByteArrayOutputStream bos = new ByteArrayOutputStream();

			this.projectGenerator.generate(projectData, (name, output) -> {
				output.accept(bos);
				final byte[] fileData = bos.toByteArray();

				final TarArchiveEntry entry = new TarArchiveEntry(name);
				entry.setSize(fileData.length);
				entry.setModTime(project.getCreated().toEpochMilli());

				tarOutputStream.putArchiveEntry(entry);
				output.accept(tarOutputStream);
				tarOutputStream.closeArchiveEntry();

				bos.reset();
			});
		}
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

	public void update(Project project)
	{
		this.projectRepository.save(project);
	}

	public void delete(Project project)
	{
		final Container container = this.containerManager.getContainer(project);
		if (container != null)
		{
			this.containerManager.stop(container);
		}

		this.projectRepository.delete(project.getId());
		this.fileRepository.delete(project.getId());
	}
}
