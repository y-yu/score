"use strict";

var config = {
	apiKey     : 'enxnz2an1739dx6r',
	windsList  : ['east', 'south', 'west', 'north'],
	firstPoint : 25000,
	counterPoint : 300,
	
	score : {
		dealer : {
			tsumo : [500, 700, 800, 1000, 1200, 1300, 1500, 1600,
				2000, 2300, 2600, 2900, 3200, 3600, 3900, 4000, 6000, 8000, 12000, 16000],
			ron   : [1500, 2000, 2400, 2900, 3400, 3900, 4400, 4800, 5300, 5800,
					6800, 7700, 8700, 9600, 10600, 11600, 12000, 18000, 24000, 36000, 48000]
		},
		nonDealer : {
			tsumo : [ [300, 500], [400, 700], [400, 800], [500, 1000], [600, 1200],
				[700, 1300], [800, 1500], [800, 1600], [1000, 2000], [1200, 2300],
				[1300, 2600], [1500, 2900], [1600, 3200], [1800, 3600], [2000, 3900],
				[2000, 4000], [3000, 6000], [4000, 8000], [6000, 12000], [8000, 16000] ],
			ron   : [1000, 1300, 1600, 2000, 2300, 2600, 2900, 3200, 3600, 3900, 4500,
					5200, 5800, 6400, 7100, 7700, 8000, 12000, 16000, 24000, 32000]
		}
	}
};


function is(type, obj) {
    var clas = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && clas === type;
}

function send_data(peer, to, data, call) {
	var json = JSON.stringify(data);
	var conn = peer.connect(to.key);
	var call = call || function () { };

	conn.on('open', function () {
		conn.send(json);
		call();
	});
}

function send_all(peer, players, data, call) {
	players.forEach( function (p) {
		send_data(peer, p, data, call);
	});
}

function Player (data, room) {
	var p;
	if (is('String', data)) {
		p = $.parseJSON(data);
	} else {
		p = data;
	}

	p.dealer = p.dealer || false;

	Object.defineProperties(this, {
		name    : { value : p.name,   writable : false, enumerable : true,  configurable : false },
		wind    : { value : p.wind,   writable : false, enumerable : true,  configurable : false },
		key     : { value : p.key,    writable : true,  enumerable : true,  configurable : false },
		room    : { value : room,     writable : true,  enumerable : true,  configurable : false },
		richi   : { value : false,    writable : true,  enumerable : true,  configurable : false },
		$dealer : { value : p.dealer, writable : true,  enumerable : false, configurable : false },
		$point  : { value : config.firstPoint, writable : true, enumerable : false, configurable : false }
	});
}

Object.defineProperties(Player.prototype, {
	point : {
		get : function () {
			return this.$point;
		},
		set : function (p) {
			this.$point = Number(p);

			this.room.d.notify('move_point', {
				player : this,
				point  : p
			});
		}
	},

	dealer : {
		get : function () {
			return this.$dealer;
		},

		set : function (b) {
			this.$dealer = b;
			this.room.d.notify('move_dealer', this);
		}
	},

	tsumo : {
		value : function (point, counter) {
			counter = Number(counter);
			
			var that = this;
			var getPoint;
			if (this.dealer === true) {
				this.room.all.filter( function (p) {
					return p !== that;
				}).forEach( function (player) {
					player.point -= (Number(point) + counter * (config.counterPoint / 3));
				});

				getPoint = Number(point) * 3;
			} else {
				this.room.all.filter( function (p) {
					return p !== that;
				}).forEach( function (player) {
					player.point -= (Number(player.dealer === true ? point[1] : point[0]) + counter * (config.counterPoint / 3) ); 
				});

				getPoint = Number(point[0]) * 2 + Number(point[1]);
			}

			this.point        += getPoint + counter * config.counterPoint + this.room.deposit;
			this.room.deposit  = 0; 

			this.room.all.forEach( function (p) {
				p.richi = false;
			});


		},
		writable     : false,
		enumerable   : false,
		configurable : false
	},

	ron : {
		value : function (player, point, counter) {
			point   = Number(point);
			counter = Number(counter);

			player.point      -= (point + counter * config.counterPoint);
			this.point        += (point + this.room.deposit + counter * config.counterPoint);
			this.room.deposit  = 0; 

			this.room.all.forEach( function (p) {
				p.richi = false;
			});
		},
		writable     : false,
		enumerable   : false,
		configurable : false
	},
	
	doRichi : {
		value : function () {
			if (this.point >= 1000 && this.richi === false) {
				this.richi         = true;
				this.point        -= 1000;
				this.room.deposit += 1000;

				this.room.d.notify('do_richi', this);

				return true;
			} else {
				return false;
			}
		},
		writable     : false,
		enumerable   : false,
		configurable : false
	},

	cancelRichi : {
		value : function () {
			if (this.richi === true) {
				this.richi         = false;
				this.point        += 1000;
				this.room.deposit -= 1000;

				this.room.d.notify('cancel_richi', this);

				return true;
			} else {
				return false;
			}
		},
		writable     : false,
		enumerable   : false,
		configurable : false
	},

	info : {
		get : function () {
			return {
				name   : this.name,
				wind   : this.wind,
				key    : this.key,
				dealer : this.dealer
			};
		}
	}
});

function Room (me, d, peer) {
	Object.defineProperties(this, {
		d        : { value : d,  writable : false, enumerable : true, configurable : false },
		me       : { value : me, writable : false, enumerable : true, configurable : false },
		all      : { value : [me], writable : true, enumerable : true, configurable : false },
		peer     : { value : peer, writable : true, enumerable : false, configurable : false },
		$deposit : { value : 0,  writable : true, enumerable : false, configurable : false },
		$counter : { value : 0,	writable : true,  enumerable : false, configurable : false }
	});

	d.notify('add_player', me);
}

Object.defineProperties(Room.prototype, {
	deposit : {
		get : function () {
			return this.$deposit;
		},

		set : function (p) {
			this.$deposit = p;
			this.d.notify('move_deposit', this.$deposit);
		}
	},

	others : {
		get : function () {
			var that = this;
			return this.all.filter( function (p) {
				return that.me !== p;
			});
		}
	},

	counter : {
		get : function () {
			return this.$counter;
		},

		set : function (c) {
			if (c >= 0) {
				this.$counter = c;
				this.d.notify('move_counter', c);
			}
		}
	},

	wind : {
		value : function (wind) {
			var l = this.all.filter(function (player) {
				return player.wind === wind;
			});

			return ( l.length === 0 ? null : l.shift() );
		},
		writable     : false,
		enumerable   : false,
		configurable : false
	},

	player : {
		value : function (name) {
			var l = this.all.filter( function (p) {
				return name === p.name;
			});

			return ( l.length === 0 ? null : l.shift() );
		},
		writable     : false,
		enumerable   : false,
		configurable : false
	},

	existWind : {
		value : function (player) {
			return this.wind(player.wind) !== null;
		},
		writable     : false,
		enumerable   : false,
		configurable : false
	},

	add : {
		value : function (player) {
			if (this.all.length < 4 && this.all.indexOf(player) === -1
			   && !this.existWind(player)) {
				this.all.push(player);
				this.d.notify('add_player', player);
			}
		},
		writable     : false,
		enumerable   : false,
		configurable : false
	},

	othersInfo : {
		get : function () {
			return this.others.map( function (p) { return p.info; } );
		}
	}
});

function makeRoom (me, firstPoint) {
	var d    = $.Deferred();
	var peer = new Peer({key: config.apiKey});
	me.room  = new Room(me, d, peer);

	config.firstPoint = firstPoint || config.firstPoint;

	peer.on('open', function (id) {
		me.key  = id;
		d.notify('get_key', id);
		d.notify('made_room', me.room);
	});

	peer.on('connection', function (conn) {
		conn.on('data', function (data) {
			comeData(data, me.room);
		})
	});

	return d.promise();
}

function joinRoom (me, key) {
	var d    = $.Deferred();
	var peer = new Peer({key: config.apiKey});
	me.room  = new Room(me, d, peer)

	peer.on('open', function (id) {
		d.notify('get_key', id);
		me.key = id;
	});

	var conn = peer.connect(key);

	peer.on('connection', function (conn) {
		conn.on('data', function (data) {
			comeData(data, me.room)
		})
	});

	conn.on('open', function () {
		var data = {
			type : 'hello',
			body : me.info
		};

		conn.send(JSON.stringify(data));
		d.notify('made_room', me.room);
	});

	return d.promise();
}

function comeData (json, room) {
	var data = $.parseJSON(json);

	console.log(data);
	if (data.type === 'hello') {
		joinPlayer(data.body, room);
	} else if (data.type === 'welcome') {
		iAccept(data.body, room);
	} else if (data.type === 'who') {
		sendInfo(data.body, room);
	} else if (data.type === 'iam') {
		registerRoom(data.body, room);
	} else if (data.type === 'win') {
		someoneWin(data.body, room);
	} else if (data.type === 'do_richi') {
		someoneRichi(data.body, room);
	} else if (data.type === 'cancel_richi') {
		someoneCancelRichi(data.body, room);
	} else if (data.type === 'i_am_dealer') {
		someoneDealer(data.body, room);
	} else if (data.type === 'i_am_not_dealer') {
		someoneNotDealer(data.body, room);
	} else if (data.type === 'move_count') {
		moveCount(data.body, room);
	}
}

function joinPlayer (player, room) {
	var owner = room.me;
	var conn  = room.peer.connect(player.key);

	conn.on('open', function () {
		var data = {
			type : 'welcome',
			body : {
				owner   : owner.info,
				others  : room.othersInfo
			}
		};
		conn.send(JSON.stringify(data));
	});
	room.add( new Player(player, room) );
}

function iAccept (room_info, room) {
	var me = room.me;
	var data = {
		type : 'who',
		body :  me.info
	};

	room.add( new Player(room_info.owner, room) );
	send_all(room.peer, room_info.others, data)
}

function sendInfo (from, room) {
	var me     = room.me;
	var player = new Player(from, room);
	var data = {
		type : 'iam',
		body : me.info
	};

	room.add(player);
	send_data(room.peer, player, data)
}

function registerRoom (player_info, room) {
	var player  = new Player(player_info, room);

	room.add(player);
}

function someoneWin (data, room) {
	var player = room.player(data.who);

	if (data.type === 'tsumo') {
		player.tsumo(data.point, room.counter);
	} else if (data.type === 'ron') {
		player.ron(room.player(data.from), data.point, room.counter);
	}
}

function someoneRichi (player, room) {
	room.player(player).doRichi();
}

function someoneCancelRichi (player, room) {
	room.player(player).cancelRichi();
}

function someoneDealer (player, room) {
	room.player(player).dealer = true;
}

function someoneNotDealer (player, room) {
	room.player(player).dealer = false;
}

function moveCount (counter, room) {
	room.counter = counter;
}
