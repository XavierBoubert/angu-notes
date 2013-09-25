function AnguNotesCtrl($scope) {
	$scope.notes = [
		{id: 1, template: 1, open: '', title: 'Ma note 1', content: 'hello hi 4', date: new Date(), dateString: '25/09/2013 16:53'},
		{id: 2, template: 2, open: '', title: 'Ma note 2', content: 'hello hi 5', date: new Date(new Date().getTime() + (24 * 60 * 60 * 1000)), dateString: '26/09/2013 16:53'}
	];

	$scope.predicate = '-date';

	$scope.contents = [
		{id: 1, content: 'hello hi 4'},
		{id: 5, content: 'hello hi 5'}
	];

	$scope.cancelUpdateNote = function() {
		$scope.closeNotes();
	};

	$scope.newNote = function() {
		$scope.closeNotes();
		$scope.notes.push({
			id: 3, template: 3, open: 'open', title: 'Nouvelle note', content: '', date: new Date(new Date().getTime() + (24 * 60 * 60 * 1000) * 2), dateString: '27/09/2013 16:53'
		});
	};

	$scope.closeNotes = function() {
		angular.forEach($scope.notes, function(note) {
			note.open = '';
		});
	};

	$scope.openNote = function(noteToOpen) {
		$scope.closeNotes();
		noteToOpen.open = 'open';
	};

	$scope.updateNote = function() {
		console.log($scope.noteContent);
	};

}