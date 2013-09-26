'use strict';

(function(window) {

	var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB,
		IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.mozIDBKeyRange || window.msIDBKeyRange,
		IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction || window.msIDBTransaction,
		console = window.console;

	window.LocalDb = function(dbName, version, updateFunc, callback) {

		var _that = this,
			_db,
			_readyCallbacks = [];

		this.isReady = false;

		this.open = function(dbName, version, updateFunc, callback) {

			if(indexedDB) {

				var request = indexedDB.open(dbName, version);

				request.onupgradeneeded = function (event) {
					if(updateFunc) {
						updateFunc(event.target.result, event.oldVersion, event.newVersion);
					}
				};

				request.onsuccess = function(event) {
					_db = this.result;
					request.onfailure = indexedDB.onerror;

					if(_db) {
						_that.isReady = true;

						for(var i = 0; i < _readyCallbacks.length; i++) {
							_readyCallbacks[i](_db);
						}

						if(callback) {
							callback(_db);
						}
					}
				};
			}
		};

		this.open(dbName, version, updateFunc, callback);

		this.ready = function(callback) {
			_readyCallbacks.push(callback);
		};

		this.insert = function(table, value, callback) {
			this.inserts(table, [value], callback);
		};

		this.inserts = function(table, values, callback) {
			if(_that.isReady) {

				var transaction = _db.transaction(table, 'readwrite');

				var adding;
				for(var i = 0; i < values.length; i++) {
					adding = transaction.objectStore(table).put(values[i]);
				}

				adding.onsuccess = function(t, t2) {
					if(callback) {
						callback();
					}
				};
			}
		};

		this.update = function(table, value, callback) {
			this.insert(table, value, callback);
		};

		this.deleteWhere = function(table, key, whereValue, callback) {
			if(_that.isReady) {

				var transaction = _db.transaction(table, 'readwrite');
				var openCursor = transaction.objectStore(table).openCursor();

				openCursor.onsuccess = function (event) {
					var result = event.target.result;
					if(!!result == false) {
						if(callback) {
							callback();
						}
						return;
					}

					if(result.value[key] == whereValue) {
						var resultDelete = result.delete();

						resultDelete.onsuccess = function (ev) {
							result.continue();
						}
						resultDelete.onerror = function (ev) {
							result.continue();
						}
					}
					else {
						result.continue();
					}
				};
			}
		};

		this.selectKey = function(table, key, callback) {
			if(_that.isReady) {
				var transaction = _db.transaction(table, 'readonly');

				var reading = transaction.objectStore(table).get(key);

				reading.onsuccess = function(event) {
					if(callback) {
						callback(event.target.result);
					}
				};
			}
		};

		this.selectWhere = function(table, key, whereValue, callback) {
			if(_that.isReady) {
				var transaction = _db.transaction(table, 'readonly');

				var openCursor = transaction.objectStore(table).openCursor();

				var results = [];

				openCursor.onsuccess = function (event) {

					var result = event.target.result;
					if(!!result == false) {

						if(callback) {
							callback(results);
						}

						return;
					}

					if(result.value[key] == whereValue) {
						results.push(result.value);
					}

					result.continue();
				};
			}
		};

		this.selectAll = function(table, callback) {
			if(_that.isReady) {
				var transaction = _db.transaction(table, "readwrite");
				var store = transaction.objectStore(table);

				var keyRange = IDBKeyRange.lowerBound(0);
				var cursorRequest = store.openCursor(keyRange);

				var results = [];

				cursorRequest.onsuccess = function(event) {

					var result = event.target.result;
					if(!!result == false) {

						if(callback) {
							callback(results);
						}

						return;
					}

					results.push(result.value);

					result.continue();
				};

				cursorRequest.onerror = indexedDB.onerror;
			}
		}
	};

})(window);

angular.module('angunotes', [])
	.factory('Notes', function() {

		return new (function() {

			var _root = this,
				_events = {},
				dbVersion = 1;

			this.elements = [];

			this.on = function(eventName, func) {
				_events[eventName] = _events[eventName] || [];
				_events[eventName].push(func);
			}

			this.fire = function(eventName, args) {
				_events[eventName] = _events[eventName] || [];
				args = args || [];
				for(var i = 0; i < _events[eventName].length; i++) {
					_events[eventName][i](args);
				}
			}

			this.add = function(note, callback) {
				callback = callback || false;
				_db.insert('notes', note, function() {
					_root.refreshNotes();
					if(callback) {
						callback();
					}
				});
			};

			this.remove = function(note, callback) {
				callback = callback || false;
				_db.deleteWhere('notes', 'id', note.id, function() {
					_root.refreshNotes();
					if(callback) {
						callback();
					}
				});
			};

			this.update = function(note, fireUpdateEvent, callback) {
				fireUpdateEvent = typeof fireUpdateEvent == 'undefined' ? true : fireUpdateEvent;
				callback = callback || false;
				_db.update('notes', note, function() {
					if(fireUpdateEvent) {
						_root.refreshNotes();
					}
					if(callback) {
						callback();
					}
				});
			};

			var _db = new window.LocalDb('anguNotes', dbVersion, function(db, oldVersion, newVersion) {

				var objectStore;

				switch (oldVersion) {
					case 0:
						objectStore = db.createObjectStore('notes', {
							keyPath: 'id', autoIncrement: true
						});
						objectStore.createIndex('id', 'id', { unique: true });

					case 1:

					break;
				}

			});

			this.refreshNotes = function() {
				_db.selectAll('notes', function(notes) {
					_root.elements = notes;
					_root.fire('update');
				});
			};

			_db.ready(function() {
				_root.refreshNotes();
			});

		})();

	});

function AnguNotesCtrl($scope, $timeout, $filter, Notes) {
	var openLastNote = false;

	$scope.notes = Notes.elements;

	$scope.predicate = '-order';

	Notes.on('update', function() {
		$timeout(function() {
			$scope.notes = $scope.cloneNotes(Notes.elements);
			if(openLastNote) {
				openLastNote = false;
				$scope.openNote($scope.notes[$scope.notes.length - 1]);
			}
		});
	});

	$("#notes-list").sortable({
		update: function( event, ui ) {
			var uiArray = $("#notes-list").sortable('toArray').reverse();
			for (var i = 0; i < $scope.notes.length; i++) {
				$scope.notes[i].order = uiArray.indexOf('note-' + $scope.notes[i].id) + 1;
				Notes.update($scope.cloneNote($scope.notes[i]), false);
			}
			$scope.$apply();
		}
	});

	$('#operations').css('display', 'block');
	$('#notes-list').css('display', 'block');

	$timeout(function() {
		$('#add-note-input').focus();
	});

	$scope.cloneNote = function(note) {
		return $scope.cloneNotes([note])[0];
	};

	$scope.cloneNotes = function(notes) {
		var keys = ['id', 'order', 'isNew', 'template', 'open', 'title', 'content', 'date', 'dateString'],
			result = [];
		for(var i = 0; i < notes.length; i++) {
			var obj = {};
			for(var j = 0; j < keys.length; j++) {
				obj[keys[j]] = notes[i][keys[j]];
			}
			result.push(obj);
		}
		return result;
	};

	$scope.addNote = function() {
		openLastNote = true;

		Notes.add({
			order: Notes.elements.length,
			isNew: true,
			template: Math.floor((Math.random() * 4) + 1),
			open: '',
			title: $scope.newNoteTitle,
			content: '',
			date: new Date(),
			dateString: $filter('date')(new Date(), 'dd/MM/yyyy hh:mm')
		});

		$scope.newNoteTitle = '';
	};

	$scope.closeNotes = function(note) {
		note = note || false;
		var hasTrash = false;
		for(var i = 0; i < $scope.notes.length; i++) {

			if($scope.notes[i].open == 'open') {
				$scope.notes[i].open = '';
				Notes.update($scope.cloneNote($scope.notes[i]), false);
			}

			if(note != $scope.notes[i] && $scope.notes[i].isNew) {
				hasTrash = $scope.cloneNote($scope.notes[i]);
			}
		}
		if(hasTrash) {
			Notes.remove(hasTrash);
			if(note) {
				openLastNote = true;
			}
		}
	};

	$scope.openNote = function(note) {
		$scope.closeNotes(note);
		note.open = 'open';

		$timeout(function() {
			$('#note-content-' + note.id).focus();
		});
	};

	$scope.updateNote = function(note) {
		note.isNew = false;
		note.open = '';
		note.title = $('#note-title-' + note.id).val();
		note.content = $('#note-content-' + note.id).val();

		Notes.update($scope.cloneNote(note), false);

		$scope.closeNotes();
	};

	$scope.cancelUpdateNote = function(note) {
		$('#note-title-' + note.id).val(note.title);
		$('#note-content-' + note.id).val(note.content);

		$scope.closeNotes();
	};

	$scope.removeNote = function(note) {
		note.isNew = true;
		$scope.closeNotes();
	};
}