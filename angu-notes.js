function AnguNotesCtrl($scope, $timeout, $filter) {
	var cacheOpenNoteContent = {
		title: '',
		content: ''
	};

	$scope.notes = [];

	$scope.predicate = '-date';

	$timeout(function() {
		document.getElementById('add-note-input').focus();
	});

	$scope.addNote = function() {
		$scope.closeNotes();

		$scope.notes.push({
			id: 3, isNew: true, template: Math.floor((Math.random() * 4) + 1), open: '', title: $scope.newNoteTitle, content: '', date: new Date(), dateString: $filter('date')(new Date(), 'dd/MM/yyyy hh:mm')
		});
		$scope.newNoteTitle = '';

		$scope.openNote($scope.notes[$scope.notes.length - 1]);
	};

	$scope.closeNotes = function(note) {
		note = note || {};
		var hasTrash = true;
		while(hasTrash) {
			hasTrash = false;
			for(var i = 0; i < $scope.notes.length; i++) {
				$scope.notes[i].open = '';
				if(note != $scope.notes[i] && $scope.notes[i].isNew) {
					hasTrash = 1 + i;
				}
			}
			if(hasTrash) {
				$scope.notes.splice(hasTrash - 1, 1);
			}
		}
	};

	$scope.openNote = function(note) {
		$scope.closeNotes(note);
		note.open = 'open';

		cacheOpenNoteContent.title = note.title;
		cacheOpenNoteContent.content = note.content;

		$timeout(function() {
			document.getElementById('note-content-' + note.id).focus();
		});
	};

	$scope.updateNote = function(note) {
		note.isNew = false;
		note.title = document.getElementById('note-title-' + note.id).value
		note.content = document.getElementById('note-content-' + note.id).value

		$scope.closeNotes();
	};

	$scope.cancelUpdateNote = function(note) {
		document.getElementById('note-title-' + note.id).value = note.title;
		document.getElementById('note-content-' + note.id).value = note.content;

		$scope.closeNotes();
	};

	$scope.removeNote = function(note) {
		note.isNew = true;
		$scope.closeNotes();
	};
}