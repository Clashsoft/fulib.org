package org.fulib.webapp.projects.projects;

import org.fulib.webapp.projects.containers.DockerContainerProvider;
import org.fulib.webapp.projects.containers.Container;
import org.fulib.webapp.projects.members.Member;
import org.fulib.webapp.projects.members.MemberRepository;

import javax.inject.Inject;
import java.io.IOException;
import java.util.List;

public class ProjectService
{
	@Inject
	ProjectRepository projectRepository;
	@Inject
	DockerContainerProvider dockerContainerProvider;
	@Inject
	ProjectGenerator projectGenerator;
	@Inject
	MemberRepository memberRepository;

	@Inject
	public ProjectService()
	{
	}

	public Project find(String id)
	{
		return this.projectRepository.find(id);
	}

	public List<Project> findByUser(String user)
	{
		return projectRepository.findByIds(memberRepository.findByUser(user).stream().map(Member::getProjectId));
	}

	public boolean isAuthorized(String projectId, String userId)
	{
		return memberRepository.findOne(projectId, userId) != null;
	}

	public void create(Project project) throws IOException
	{
		projectRepository.create(project);
		updateMember(project);
	}

	public void update(Project project)
	{
		projectRepository.update(project);
		updateMember(project);
	}

	private void updateMember(Project project)
	{
		final Member owner = new Member();
		owner.setProjectId(project.getId());
		owner.setUserId(project.getUserId());
		memberRepository.update(owner);
	}

	public void delete(Project project)
	{
		final Container container = this.dockerContainerProvider.find(project.getId());
		if (container != null)
		{
			this.dockerContainerProvider.kill(container);
		}

		memberRepository.deleteByProject(project.getId());

		this.dockerContainerProvider.delete(project);
		this.projectRepository.delete(project.getId());
	}
}
