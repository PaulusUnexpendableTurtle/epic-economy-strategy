const map_gen = require('./client/lib/map_gen').MapGen,
	  coords = require('./client/lib/coords').CoordsEnvironment,
	  fs = require('fs'),
	  Papa = require('papaparse'),
	  sync = require('synchronize');

const express = require('express'),
	  app = express(),
	  server = require('http').Server(app),
	  io = require('socket.io')(server);

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

const table_names = ['map-table', 'player-table', 'buildings-table', 'link-table'];
var mapData,
	resData,
	buiData,
	linkData;

var parses = [];
table_names.forEach((elem) => parse(elem));

const building_replica = [];

var countLoads = 0;
const numberOfParses = 4;

var field_list = [],
	player_list = [];

io.sockets.on('connection', (socket) => {
	console.log(`socket ${socket.id} connected`);
	if (countLoads == numberOfParses) {
		if (!building_replica.length) {
			mapData = parses[table_names[0]];
			resData = parses[table_names[1]];
			buiData = parses[table_names[2]];
			linkData = parses[table_names[3]];
			build_replicas();
		}
		var indexPlayer, indexField, indexOfMap;
		socket.on('new_player', (data) => {
			console.log(`new player ${data.id}`);
			var spawn = next_player();
			var new_player = new Player(
				data.id, spawn
				//another params
			);
			spawn.resources = new_player.getRes();
			player_list.push(new_player);
			indexField = field_list[indexOfMap = spawn.i].push_player(indexPlayer = player_list.length - 1);
			spawn.buiData = buiData;
			socket.emit('gameDataSend', spawn);
		});
		socket.on('build', (data) => {
			console.log('build request: ');
			console.log(data);
			if (!(
				(field_list[indexOfMap].reaches(indexField, data.build) || player_list[indexPlayer].buildings == 0) && 
				field_list[indexOfMap].empty(data.build) && 
				player_list[indexPlayer].tryChangeRes(getBuildCost(data.build.value), data.option)
				)) return;
			data.build.owner = indexField;
			field_list[indexOfMap].place_building(data.build);
			++player_list[indexPlayer].buildings;
			player_list[indexPlayer].addBuilding(data.build);
		});
		socket.on('upgrade_building', (data) => {
			if(!(
				field_list[indexOfMap].owns(indexField, data.coords) &&
				player_list[indexPlayer].tryChangeRes(field_list[indexOfMap].getUpgradeCost(data.coords), data.option)
				)) return;
			field_list[indexOfMap].upgrade(data.coords);
		});
		socket.on('remove_building', (coords) => {
			if(!(
				!field_list[indexOfMap].empty(coords) &&
				field_list[indexOfMap].owns(indexField, coords)
				)) return;
			field_list[indexOfMap].remove_building(coords);
			--player_list[indexPlayer].buildings;
			player_list[indexPlayer].removeBuilding(coords);
		});
		socket.on('chunk_send', (chunk) => {
			console.log(`chunk updated on map ${indexOfMap}: ${chunk}`);
			field_list[indexOfMap].emit_chunk(chunk);
		});
		socket.on('disconnect', () => {
			if (indexPlayer === undefined) return;
			console.log(`player ${socket.id} (map ${indexOfMap}, position ${indexField}) disconnected`);
			field_list[indexOfMap].remove_player(indexField);
			player_list[indexPlayer].clearBuildings(indexOfMap);
			player_list.splice(indexPlayer, 1);
		});
	}
});

server.listen(process.env.PORT || 4000);

function parse(name) {
	fs.readFile(`./res/${name}.csv`, 'utf-8', (err, data) => {
		if (err) {
			console.log(`error while reading file ${name} occured`);
			throw err;
		}
		console.log(`${name} succesfully read`);
		Papa.parse(data, {
			header: true, 
			dynamicTyping: true,
			complete: (result) => {
				if (result.data[0].richness) result.data.forEach((elem) => elem.richness /= 100);
				parses[name] = result.data;
				++countLoads;
				console.log(`${name} succesfully parsed`);
			}
		});
	});
}

function next_player() {
	var result = field_list.find((elem) => elem.canTake());
	console.log(`it will be on map ${result === undefined ? result : result.getIndex()}`);
	if (!result) {
		console.log('new map');
		field_list.push(result = new Field(next_map(), field_list.length));
	}
	return result.get_next();
};

//player_id stores socket.ids
function Player(player_id, spawn_point) {
	var res = new Resources();
	var capacity = res.sum();
	var buildingsCoords = [];
	this.addBuilding = (coords) => {
		buildingsCoords.push(coords);
	};
	this.removeBuilding = (coords) => {
		buildingsCoords.splice(buildingsCoords.indexOf(coords), 1);
	};
	this.clearBuildings = (fieldIndex) => {
		buildingsCoords.forEach((elem) => {
			field_list[fieldIndex].remove_building(elem);
		});
	};
	this.getId = () => player_id;
	this.getSpawn = () => spawn_point;
	this.getRes = () => {
		var ret = res.toJSON();
		ret.cap = capacity;
		console.log('getRes:');
		console.log(ret);
		return ret;
	};
	this.tryChangeRes = (data, option) => {
		console.log('trying to pay: ');
		console.log(data);
		console.log(`(${option})`);
		var ans = res.tryChange(data, option);
		console.log(`paid? ${ans}`);
		if (ans) {
			io.to(player_id).emit('resources_updated', this.getRes());
			//TODO: substract from storages
		}
		return ans;
	};
	this.buildings = 0;
	this.changeCapacity = (delta) => capacity += delta;
};

function Resources() {
	var R = resData[0].start_r, G = resData[0].start_g, B = resData[0].start_b, M = resData[0].start_m;
	this.tryChange = (data, option) => {
		if (option === undefined) {
			R += data.r ? data.r : 0;
			G += data.g ? data.g : 0;
			B += data.b ? data.b : 0;
			M += data.m ? data.m : 0;
			return true;
		}
		if (option) {
			if (M < data.m || data.m == -1) return false;
			M -= data.m;
			return true;
		}
		if (R < data.r || data.r == -1 || 
			G < data.g || data.g == -1 ||
			B < data.b || data.b == -1
			) 
			return false;
		R -= data.r;
		G -= data.g;
		B -= data.b;
		return true;
	};
	this.toJSON = () => {return {r: R, g: G, b: B, m: M};}
	this.sum = () => R + G + B;
}
function Vessel(maxCapacity) {
	this.r = 0;
	this.g = 0;
	this.b = 0;
	this.tryChange = (delta, div) => {
		let dr, dg, db;
		with(Math) {
			dr = min(floor(delta.r / div), maxCapacity - this.r - this.g - this.b);
			this.r += dr;
			dg = min(floor(delta.g / div), maxCapacity - this.r - this.g - this.b);
			this.g += dg;
			db = min(floor(delta.b / div), maxCapacity - this.r - this.g - this.b);
			this.b += db;
		}
		return {r: dr, g: dg, b: db};
	}
}

var counter = 0;
function next_map() {
	if (counter == mapData.length)
		counter = 0;
	while (!mapData[counter].a) {
		++counter;
		if (counter == mapData.length)
			counter = 0;
	}
	console.log(mapData[counter]);
	return mapData[counter++];
};

function precedes(fat, son) {
	return linkData.some((elem) => elem.f == fat && elem.t == son);
};

const MAX_PLAYERS = 2, msPerTick = 1000;

function Field(params, index) {
	var filled = false,
		hasPlace = true,
		map = map_gen.buildChunked(params),
		bui = [[]],
		bui_to_send = [[]],
		players = [],
		CE = new coords(42, params.chunkWidth, params.chunkHeight),
		n = map.length, m = map[0].length;
	for (let ci = 0; ci < n; ++ci) {
		bui[ci] = [];
		for (let cj = 0; cj < m; ++cj) {
			bui[ci][cj] = [];
			map[ci][cj].bui = [];
			for (let i = 0; i < params.chunkWidth && map[ci][cj].res[i]; ++i) {
				bui[ci][cj][i] = [];
				map[ci][cj].bui[i] = [];
				for (let j = 0; j < params.chunkHeight; ++j) {
					if (map[ci][cj].res[i][j]) {
						bui[ci][cj][i][j] = {
							bui: new ResourceSource(map[ci][cj].res[i][j]),
							val: -map[ci][cj].res[i][j],
							own: -1
						};
						map[ci][cj].bui[i][j] = `${-map[ci][cj].res[i][j]}_-1`;
					}
				}
			}
		}
	}
	this.canTake = () => !filled && hasPlace;
	this.getIndex = () => index;
	this.emit_chunk = (x, y) => {
		players.forEach((elem) => io.to(player_list[elem].getId()).emit('chunkUpdated', map[x][y]));
	};
	this.push_player = (pl_id) => {
		players.push(pl_id);
		if (players.length >= MAX_PLAYERS) {
			console.log(`map ${index} filled`);
			filled = true;
		}
		return players.length - 1;
	};
	this.getPlayer = (index) => players[index]; 
	this.empty = (coords) => {
		var chunk = map[coords.cx][coords.cy],
			res = !chunk.bui[coords.dx][coords.dy] && chunk.res[coords.dx][coords.dy] == 0;
		console.log(`empty? ${res}`);
		return res;
	};
	this.reaches = (player, coords) => {
		//TODO: will be different
		var res = true;
		console.log(`reaches? ${res}`);
		return res;
	};
	this.place_building = (data) => {
		if (!bui_to_send[data.cx])
			bui_to_send[data.cx] = [];
		if (!bui_to_send[data.cx][data.cy])
			bui_to_send[data.cx][data.cy] = [];
		if (!bui_to_send[data.cx][data.cy][data.dx])
			bui_to_send[data.cx][data.cy][data.dx] = [];

		map[data.cx][data.cy].bui[data.dx][data.dy] = bui_to_send[data.cx][data.cy][data.dx][data.dy] = data.value + "_" + data.owner;
		
		var building = makeBuilding(data.value, data.owner, index);
		
		var offset = new CE.Offset(data.cx * params.chunkWidth + data.dx, data.cy * params.chunkHeight + data.dy);
		for (let i = 0; i < 6; ++i) {
			var neigh = offset.getNeighbor(i),
				nech = neigh.toChunk(),
				tdx = neigh.getRow() % params.chunkWidth,
				tdy = neigh.getCol() % params.chunkHeight,
				other = bui[nech.getX()][nech.getY()][tdx][tdy];
			if (other === undefined || (other.own >= 0 && other.own != data.owner)) continue;
			//TODO: add resources to link table
			if (precedes(data.value, other.val)) {
				building.outputs.push(other.bui);
				other.bui.neighbours.push(building);
			}
			if (precedes(other.val, data.value)) {
				building.neighbours.push(other.bui);
				other.bui.outputs.push(building);
			}
		}

		bui[data.cx][data.cy][data.dx][data.dy] = {
			bui: building, 
			own: data.owner, 
			val: data.value, 
			clb: setInterval(building.call, building.getTime() * msPerTick)
		};

		console.log(`succesfully built ${data.value} on ${data.cx} ${data.cy} ${data.dx} ${data.dy}`);
		
		this.emit_chunk(data.cx, data.cy);
	};
	this.owns = (player, coords) => bui[coords.cx][coords.cy][coords.dx][coords.dy] && bui[coords.cx][coords.cy][coords.dx][coords.dy].own == player;
	this.getValue = (coords) => bui[coords.cx][coords.cy][coords.dx][coords.dy].val;
	this.getUpgradeCost = (coords) => bui[coords.cx][coords.cy][coords.dx][coords.dy].bui.getUpgradeCost();
	this.upgrade = (coords) => {
		var cell = bui[coords.cx][coords.cy][coords.dx][coords.dy];
		clearInterval(cell.clb);
		cell.bui.upgrade();
		cell.clb = setInterval(cell.bui.call, cell.bui.getTime() * msPerTick);
	};
	this.remove_building = (crd) => {
		var cell = bui[crd.cx][crd.cy][crd.dx][crd.dy];
		
		clearInterval(cell.clb);
		
		cell.bui.neighbours.forEach((elem) => {
			elem.outputs = elem.outputs.splice(elem.outputs.indexOf(cell.bui), 1);
		});
		cell.bui.outputs.forEach((elem) => {
			elem.neighbours = elem.neighbours.splice(elem.neighbours.indexOf(cell.bui), 1);
		});
		
		bui[crd.cx][crd.cy][crd.dx][crd.dy] = undefined;
		map[crd.cx][crd.cy].bui[crd.dx][crd.dy] = bui_to_send[crd.cx][crd.cy][crd.dx][crd.dy] = undefined;
		
		this.emit_chunk(crd.cx, crd.cy);
	};
	this.remove_player = (pl_index) => {
		players.splice(pl_index, 1);
		if (players.length < MAX_PLAYERS) {
			console.log(`map ${index} can take in more players`);
			filled = false;
		}
	};
	this.get_next = () => {
		//TODO: will be different
		return { 
			homeCell: { 
				row: 16, 
				col: 16 
			}, 
			i: index, 
			mapParams: params,
			buildings: bui_to_send
		};
	};
};

const start_res = 5000;
function ResourceSource(type) {
	this.own = -1;
	this.type = -type;
	this.product = {
		r: type == 1 ? start_res : 0, 
		g: type == 2 ? start_res : 0,
		b: type == 3 ? start_res : 0
	};
	this.outputs = [];
};

function build_replicas() {
	let s = buiData.length;
	for (let i = 0; i < s && buiData[i].func.length > 0; ++i)
		building_replica[i] = build_replica(buiData[i], i);
};
function build_replica(info, type) {
	var res = {},
		cost = {
			r: info.cost_r,
			g: info.cost_g,
			b: info.cost_b,
			m: info.cost_gold
		};
	res.getCost = () => cost;

	var in_u = getFunc(info.in_u),
		time_u = getFunc(info.time_u),
		cap_u = getFunc(info.cap_u),
		out_u = getFunc(info.out_u),
		cost_u = getFunc(info.cost_u);

	res.create = function(map, owner) {
		var time = info.time, cap = info.cap,
			my_cost = upgrade_cost(cost);
		this.type = type;
		this.inp = info.in;
		this.out = info.out;
		this.neighbours = [];
		this.outputs = [];
		this.product = new Vessel(cap);
		console.log(this.product);
		if (info.func.includes("store")) {
			this.call = () => {
				console.log(`calling store of ${owner} on ${map}`);
				let dr = 0, dg = 0, db = 0, tves = this.product;
				this.neighbours.every((elem) => {
					if (tves.r + tves.g + tves.b  == cap)
						return false;
					let d = tves.tryChange(elem.product, elem.outputs.length);
					dr += d.r;
					dg += d.g;
					db += d.b;
					elem.product.r -= d.r;
					elem.product.g -= d.g;
					elem.product.b -= d.b;
					return true;
				});
				console.log(this.product);
				player_list[field_list[map].getPlayer(owner)].tryChangeRes({r: dr, g: dg, b: db});
			};
		} else if (info.func.includes("sell")) {
			this.call = () => {
				console.log(`calling sell of ${owner} on ${map}`);
				let mass = 0, max_mass = this.inp;
				this.neighbours.every((elem, i, arr) => {
					if (mass == max_mass) return false;
					let d = 0;
					with(Math) {
						d += min(min(max_mass - mass - d, floor(max_mass / arr.length)), floor(elem.product.r / elem.outputs.length));
						d += min(min(max_mass - mass - d, floor(max_mass / arr.length)), floor(elem.product.g / elem.outputs.length));
						d += min(min(max_mass - mass - d, floor(max_mass / arr.length)), floor(elem.product.b / elem.outputs.length));
					}
					mass += d;
					return true;
				});
				player_list[field_list[map].getPlayer(owner)].tryChangeRes({m: Math.floor(mass / max_mass * this.out)});
			};
		} else {
			this.call = () => {
				console.log(`calling production of ${owner} on ${map}`);
				let mass = {r: 0, g: 0, b: 0}, max_mass = this.inp;
				this.neighbours.every((elem, i, arr) => {
					if (mass.r + mass.g + mass.b == max_mass) return false;
					with(Math) {
						if (info.func.includes("_r") || info.func.includes("_u")) {
							let dr = min(min(max_mass - (mass.r + mass.g + mass.b), floor(max_mass / arr.length)), floor(elem.product.r / elem.outputs.length));
							elem.product.r -= dr;
							mass.r += dr;
						}
						if (info.func.includes("_g") || info.func.includes("_u")) {
							let dg = min(min(max_mass - (mass.r + mass.g + mass.b), floor(max_mass / arr.length)), floor(elem.product.g / elem.outputs.length));
							elem.product.g -= dg;
							mass.g += dg;
						}
						if (info.func.includes("_b") || info.func.includes("_u")) {
							let db = min(min(max_mass - (mass.r + mass.g + mass.b), floor(max_mass / arr.length)), floor(elem.product.b / elem.outputs.length));
							elem.product.b -= db;
							mass.b += db;
						}
					}
					return true;
				});
				this.product.r += Math.floor(mass.r / this.inp * this.out);
				this.product.g += Math.floor(mass.g / this.inp * this.out);
				this.product.b += Math.floor(mass.b / this.inp * this.out);
				console.log(this.product);
			};
		}
		this.upgrade = () => {
			this.inp = in_u(this.inp);
			this.out = out_u(this.out);
			time = time_u(time);
			cap = cap_u(cap);
			my_cost = upgrade_cost(my_cost);
		};
		this.getUpgradeCost = () => my_cost;
		this.getTime = () => time;
		this.getCapacity = () => cap;
	};

	function upgrade_cost(cost) {
		return {
			r: cost_u(cost.r),
			g: cost_u(cost.g),
			b: cost_u(cost.b),
			m: cost_u(cost.m)
		};
	};

	return res;
};

function getFunc(comm) {
	var seq = comm.split(" ");
	if (seq[0] == "add") return add(seq[1]);
	if (seq[0] == "multiply") return mul(seq[1]);
};
var add = (num) => (x) => {return x == -1 ? -1 : (x + Number(num));},
	mul = (num) => (x) => {return x == -1 ? -1 : (x * Number(num));};

function makeBuilding(id, owner, map) {
	console.log(`making ${id} of ${owner} on ${map}`);
	return new building_replica[id - 1].create(map, owner);
};
function getBuildCost(id) {
	return building_replica[id - 1].getCost();
};