// =============== Constants ===============

const solutionInputConfig = {
	theme: 'idea',
	mode: 'markdown',
	lineNumbers: true,
	lineWrapping: true,
	styleActiveLine: true,
};

// =============== Functions ===============

function getSolutionIDFromURL() {
	return new URL(window.location).searchParams.get('solution');
}

function getTokenHeaders() {
	return {
		'Assignment-Token': getAssignmentToken(assignmentID),
		'Solution-Token': getSolutionToken(assignmentID, solutionID),
	};
}

function getSolutionToken(assignmentID, solutionID) {
	return localStorage.getItem(`assignment/${assignmentID}/solution/${solutionID}/token`);
}

function setSolutionToken(assignmentID, solutionID, token) {
	localStorage.setItem(`assignment/${assignmentID}/solution/${solutionID}/token`, token);
}

function loadSolution(assignmentID, solutionID, handler, errorHandler) {
	const headers = getTokenHeaders();
	apih('GET', `/assignment/${assignmentID}/solution/${solutionID}`, headers, null, result => {
		if (result.error) {
			errorHandler(result.error);
		}
		else {
			handler(result);
		}
	});
}

function renderSolution(solution) {
	solutionInputCM.setValue(solution.solution);
	nameInput.value = solution.name;
	emailInput.value = solution.email;
	studentIDInput.value = solution.studentID;
	submitTimeStampLabel.innerText = new Date(solution.timeStamp).toLocaleString();

	renderResults(solution.results);
}

function renderResults(results) {
	const taskLists = document.getElementsByClassName('assignment-task-list');
	const pointsLabels = document.getElementsByClassName('assignment-task-points');

	for (const taskList of taskLists) {
		for (let i = 0; i < results.length; i++) {
			const taskItem = taskList.children[i];
			const result = results[i];

			// TODO show output
			if (result.points === 0) {
				taskItem.classList.remove('text-success');
				taskItem.classList.add('text-danger');
			} else {
				taskItem.classList.remove('text-danger');
				taskItem.classList.add('text-success');
			}
		}
	}

	for (const pointsLabel of pointsLabels) {
		const index = pointsLabel.dataset.taskIndex;
		const result = results[index];

		// TODO this is kinda hacky. Should be done by gaining access to the task object
		const slashPos = pointsLabel.innerText.indexOf('/');
		const taskPoints = slashPos >= 0 ? pointsLabel.innerText.substring(slashPos + 1) : pointsLabel.innerText;

		pointsLabel.innerText = `${result.points}/${taskPoints}`;

		pointsLabel.classList.remove('badge-secondary');
		if (result.points === 0) {
			pointsLabel.classList.remove('badge-success');
			pointsLabel.classList.add('badge-danger');
		}
		else {
			pointsLabel.classList.remove('badge-danger');
			pointsLabel.classList.add('badge-success');
		}
	}
}
