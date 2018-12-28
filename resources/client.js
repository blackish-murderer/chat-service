function randomNick(minInt, maxInt) {
  minInt = Math.ceil(minInt);
  maxInt = Math.floor(maxInt);
  return 'anonymous' + String(Math.floor(Math.random() * (maxInt - minInt)) + minInt); //The maximum is exclusive and the minimum is inclusive
}

const verifyNickname = (nick) => /^[a-zA-Z0-9_]{1,24}$/.test(nick);

function localStorageGet(key) {
	try {
		return window.localStorage[key]
	} catch (e) { }
}

function localStorageSet(key, val) {
	try {
		window.localStorage[key] = val
	} catch (e) { }
}

var ws;
var myNick = localStorageGet('my-nick') || randomNick(10, 100);
var myChannel = 'CHATBOX';
var lastSent = [""];
var lastSentPos = 0;

function join(channel) {
  ws = new WebSocket('wss://hack.chat/chat-ws');

	var wasConnected = false;

	ws.onopen = function () {
		if (!wasConnected) {
			if (location.hash) {
				myNick = location.hash.substr(1);
			} else {
				myNick = prompt('Nickname:', myNick);
			}
		}

		if (myNick) {
			localStorageSet('my-nick', myNick);
			send({ cmd: 'join', channel: channel, nick: myNick });
		}

		wasConnected = true;
	}

	ws.onclose = function () {
		if (wasConnected) {
			pushMessage({ nick: '!', text: "Server disconnected. Attempting to reconnect. . ." });
		}

		window.setTimeout(function () {
			join(channel);
		}, 2000);
	}

	ws.onmessage = function (message) {
		var args = JSON.parse(message.data);
		var cmd = args.cmd;
		var command = COMMANDS[cmd];
		command.call(null, args);
	}
}

var COMMANDS = {
	chat: function (args) {
		if (ignoredUsers.indexOf(args.nick) >= 0) {
			return;
		}

		pushMessage(args);
	},

	info: function (args) {
		args.nick = '*';

		pushMessage(args);
	},

	warn: function (args) {
		args.nick = '!';

		pushMessage(args);
	},

	onlineSet: function (args) {
		var nicks = args.nicks;

		usersClear();

		nicks.forEach(function (nick) {
			userAdd(nick);
		});

		//pushMessage({ nick: '*', text: "Users online: " + nicks.join(", ") })
	},

	onlineAdd: function (args) {
		var nick = args.nick;

		userAdd(nick);

		pushMessage({ nick: '*', text: nick + " joined" });
	},

	onlineRemove: function (args) {
		var nick = args.nick;

		userRemove(nick);

		pushMessage({ nick: '*', text: nick + " left" });
	}
}

function pushMessage(args) {
  let query = '';
  let _nick = myNick.split('#')[0];
  //let stamp = (new Date(args.time || Date.now())).toLocaleString();

	if (verifyNickname(_nick) && args.nick == _nick) {
		query = '<div class="message internal">' + args.text + '</div>';
	} else if (args.nick == '!') {
    query = '<div class="message warn">' + args.text + '</div>';
	} else if (args.nick == '*') {
		query = '<div class="message info">' + args.text + '</div>';
	} else {
    query = '<div class="message external"><div class="nick">' + args.nick + '</div><figure class="avatar"><img src="icons/them.png" /></figure>' + args.text + '</div>';
  }
  $(query).appendTo($('#mCSB_1_container')).addClass('new');
  updateMessagesScrollbar();
  
	unread += 1;
	updatePageTitle();
}

function send(data) {
	if (ws && ws.readyState == ws.OPEN) {
		ws.send(JSON.stringify(data));
	}
}

var windowActive = true;
var unread = 0;

window.onfocus = function () {
	windowActive = true;

  $messages.mCustomScrollbar('scrollTo', 'last');
	updatePageTitle();
}

window.onblur = function () {
	windowActive = false;
}

window.onscroll = function () {
	if (isAtBottom()) {
		updatePageTitle();
	}
}

function isAtBottom() {
	return true;
}

function updatePageTitle() {
	if (windowActive && isAtBottom()) {
		unread = 0;
	}

	var title;
	if (myChannel) {
		title = myChannel;
	} else {
		title = 'CHATBOX';
	}

	if (unread > 0) {
		title = '(' + unread + ') ' + title;
	}

	document.title = title;
}

// User list
var onlineUsers = [];
var ignoredUsers = [];

function userAdd(nick) {
  let myImg = 'icons/them.png';
  if (myNick.split('#')[0] == nick) {
    myImg = 'icons/self.png';
  }
  $('<div class="user append"><figure class="avatar"><img src="' + myImg + '" /></figure>' + nick + '</div>').appendTo($('#mCSB_2_container')).addClass('new');
	onlineUsers.push(nick);
  
  updateChatTitle();
	updateUsersScrollbar();
}

function userRemove(nick) {
  var users = $('#mCSB_2_container').children();
  for(let i = 0; i < users.length; i++) {
    if (users[i].textContent == nick) {
      users[i].remove();
    }
  }
	var index = onlineUsers.indexOf(nick);
	if (index >= 0) {
		onlineUsers.splice(index, 1);
	}
  
  updateChatTitle();
	updateUsersScrollbar();
}

function usersClear() {
  $('#mCSB_2_container').empty();
	onlineUsers.length = 0;
  
  updateChatTitle();
	updateUsersScrollbar();
}

function updateChatTitle() {
  let myText = 'no users online';
  if (onlineUsers.length == 1) {
    myText = onlineUsers.length + 'user online';
  } else if (onlineUsers.length > 1) {
    myText = onlineUsers.length + 'users online';
  }
  
  $('.chat-title h2').html(myText);
}

/*
function userInvite(nick) {
	send({ cmd: 'invite', nick: nick });
}

function userIgnore(nick) {
	ignoredUsers.push(nick);
}
*/

////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

join(myChannel);

var $messages = $('.messages-content');

var $users = $('.users-content');

function updateMessagesScrollbar() {
  $messages.mCustomScrollbar("update").mCustomScrollbar('scrollTo', 'bottom', {
    scrollInertia: 10,
    timeout: 0
  });
}

function updateUsersScrollbar() {
  $users.mCustomScrollbar("update").mCustomScrollbar('scrollTo', 'top', {
    scrollInertia: 10,
    timeout: 0
  });
}

$(window).load(function() {
  $messages.mCustomScrollbar({ theme: 'dark' });
  $users.mCustomScrollbar({ theme: 'dark' });
  windowActive = true;
  unread = 0;
});

$('.message-submit').click(function() {
  let text = $('.message-input').val();
  if (text != '') {
    send({ cmd: 'chat', text: text });
    $('.message-input').val(null);

		lastSent[0] = text;
		lastSent.unshift("");
		lastSentPos = 0;
  }
});

$(window).on('keydown', function(e) {
	if (e.keyCode == 13 && !e.shiftKey) {
		e.preventDefault();

    if (e.target.value == '') {
      e.target.value = msg = $('.message-input').val() || '';
    }

		// Submit message
		if (e.target.value != '') {
			var text = e.target.value;
			e.target.value = '';

			send({ cmd: 'chat', text: text });

			lastSent[0] = text;
			lastSent.unshift("");
			lastSentPos = 0;
		}
  }
});

