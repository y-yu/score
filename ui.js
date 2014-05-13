var room;
var me;
var key = location.hash.slice(1);
var d;

$('#indicater').hide();
$('#commands').hide();


function getPoint (point, dealer) {
	if ( is('Array', point) ) {
		return (dealer === true ? point[1] : point[0]);
	} else {
		return point;
	}
}

function makeWinDropdown () {
	if (room === undefined ) { return null; } 
	room.all.forEach( function (player) {
		var score;

		if (player === me) {
			score = (player.dealer === true ? config.score.dealer.tsumo : config.score.nonDealer.tsumo);

			score.map( function (point) {
				return $('<li><a>' + getPoint(point, player.dealer) + '</a></li>').click( function () {
					player.tsumo(point, $('#counter').text());

					send_all(room.peer, room.others, {
						type : 'win',
						body : {
							type  : 'tsumo',
							who   : player.name,
							point : point 
						}
					});
				});
			}).forEach( function (dom) {
				$('#' + player.wind).children('.dropdown-menu').append(dom);
			});
		} else {
			score = (me.dealer === true ? config.score.dealer.ron : config.score.nonDealer.ron);

			score.map( function (point) {
				return $('<li><a>' + point + '</a></li>').click( function () {
					me.ron(player, point, $('#counter').text());

					send_all(room.peer, room.others, {
						type : 'win',
						body : {
							type  : 'ron',
							who   : me.name,
							point : point,
							from  : player.name
						}
					});
				});
			}).forEach( function (dom) {
				$('#' + player.wind).children('.dropdown-menu').append(dom);
			});
		}
	});
}

$('#dealer').click( function () {
	if ( room.all.every( function (p) { return p.dealer === false; }) ) {
		var data = {
			type : 'i_am_dealer',
			body : me.name
		};

		send_all(room.peer, room.others, data);

		me.dealer = true;
		$(this).addClass('active');
	} else if (me.dealer === true) {
		var data = {
			type : 'i_am_not_dealer',
			body : me.name
		};

		send_all(room.peer, room.others, data);

		me.dealer = false;
		$(this).removeClass('active');
	}
});

$('#richi').click( function () {
	var data = { body : me.name };
	if (me.doRichi() === true) {
		data.type = 'do_richi';
		$(this).addClass('active');
	} else if (me.cancelRichi() === true) {
		data.type = 'cancel_richi';
		$(this).removeClass('active');
	}

	send_all(room.peer, room.others, data);
});

$('#counter-up').click( function () {
	$('#counter').text( Number($('#counter').text()) + 1 );


	send_all(room.peer, room.others, {
		type : 'move_count',
		body :  Number($('#counter').text())
	});
});

$('#counter-down').click( function () {
	if ($('#counter').text() > 0) {
		$('#counter').text( Number($('#counter').text()) - 1 );

		send_all(room.peer, room.others, {
			type : 'move_count',
			body :  Number($('#counter').text())
		});
	}
});

$('#ron').click( function () {
	var point = $('#point').val();
	var from  = $('#from').val();

	me.ron(room.player(from), point);

	var data = {
		type : 'win',
		body : {
			type  : 'ron',
			who   : me.name,
			from  : from,
			point : point
		}
	};

	send_all(room.peer, room.others, data);
});

$('#submit').click( function () {
	me = new Player({
		name : $('#name').val(),
		wind : $('#wind').val(),
	});

	if (key === '') {
		d = makeRoom(me);

		d.progress( function (mode, obj) {
			observer('owner', mode, obj);
		});
	} else {
		d = joinRoom(me, key);

		d.progress( function (mode, obj) {
			observer('player', mode, obj);
		});
	}

	$('#indicater').show();
	$('#player-info').hide();
	$('#commands').show();
});


function observer (type, mode, obj) {
	console.log(mode);

	if (mode === 'get_key' && type === 'owner') {
		$('#room-name').text(location.href + '#' + obj);
	} else if (mode === 'made_room') {
		room = obj;
	} else if (mode === 'add_player') {
		addPlayer(obj);
	} else if (mode === 'move_deposit') {
		moveDeposit(obj);
	} else if (mode === 'move_point') {
		movePoint(obj);
	} else if (mode === 'move_dealer') {
		moveDealer(obj);
	} else if (mode === 'move_counter') {
		moveCounter(obj);
	}
}

function addPlayer (player) {
	var css = {};

	if (me === player)
		css.fontWeight = 'bold';

	if (player.dealer === true)
		css.color = '#F00';

	$('#' + player.wind).children('.name').text(player.name).css(css);
	$('#' + player.wind).children('.point').text(player.point);

	if (player.name !== me.name) {
		$('#from').append('<option value="' + player.name + '">' + player.name + '</option>');
	}

	makeWinDropdown();
}

function moveDeposit (point) {
	$('#deposit').children('.point').text(point);
}

function movePoint (obj) {
	var player = obj.player;
	var point  = obj.point;

	$('#' + player.wind).children('.point').text(point);
	$(this).removeClass('active');
}

function moveDealer (player) {
	if (player.dealer === true) {
		$('#' + player.wind).children('.name').css({ color : '#F00' });

		if (player !== me)
			$('#dealer').attr({ disabled : 'disabled' });
	} else {
		$('#' + player.wind).children('.name').css({ color : '' });

		if (player !== me)
			$('#dealer').removeAttr('disabled');
	}

	makeWinDropdown();
}

function moveCounter (counter) {
	$('#counter').text(counter);
}
