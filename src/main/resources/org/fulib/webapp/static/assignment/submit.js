// =============== Elements ===============

const solutionInput = document.getElementById('solutionInput');
const solutionInputCM = CodeMirror.fromTextArea(solutionInput, solutionInputConfig);

const nameInput = document.getElementById('nameInput');
const studentIDInput = document.getElementById('studentIDInput');
const emailInput = document.getElementById('emailInput');

const submitButton = document.getElementById('submitButton');

const solutionInfo = document.getElementById('solutionInfo');

const submissionTimeLabel = document.getElementById('submissionTimeLabel');
const solutionLink = document.getElementById('solutionLink');
const tokenLabel = document.getElementById('tokenLabel');

const assignmentID = getAssignmentIDFromURL();

// =============== Initialization ===============

(() => {
	autoUpdateEditorTheme(solutionInputCM);

	loadAssignment(assignmentID, renderAssignment);

	autoSave('assignment/view/',
		nameInput,
		studentIDInput,
		emailInput,
	);

	autoSaveCM('assignment/view/solutionInput', solutionInputCM, check);
})();

// =============== Functions ===============

function check() {
	solutionInfo.innerText = 'Checking...';

	const data = {
		solution: solutionInputCM.getValue(),
	};
	api('POST', `/assignments/${assignmentID}/check`, data, result => {
		renderResults(result.results);

		solutionInfo.innerText = 'Your solution was checked automatically. Don\'t forget to submit when you are done!';
	});
}

function submit() {
	submitButton.disabled = true;
	submitButton.innerText = 'Submitting...';

	const data = {
		assignmentID: assignmentID,
		name: nameInput.value,
		studentID: studentIDInput.value,
		email: emailInput.value,
		solution: solutionInputCM.getValue(),
	};

	api('POST', `/assignments/${assignmentID}/solution`, data, result => {
		const timeStamp = new Date(result.timeStamp);
		submissionTimeLabel.innerText = timeStamp.toLocaleString();

		const link = absoluteLink(`/assignments/${assignmentID}/solutions/${(result.id)}`);
		solutionLink.innerText = link;
		solutionLink.href = link;

		tokenLabel.innerText = result.token;
		setSolutionToken(assignmentID, result.id, result.token);

		submitButton.disabled = false;
		submitButton.innerText = 'Submit';

		$('#successModal').modal('show');
	});
}
