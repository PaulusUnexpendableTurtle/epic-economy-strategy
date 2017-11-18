//socket.io
const socket = io.connect();

socket.on('connect', function() {
	console.log("connect");
});

//PIXI.js
const gl = PIXI.autoDetectRenderer(256, 256);
const stage = new PIXI.Container();
function texture(path) {
	return PIXI.loader.resources[path].texture;
};

const imagePathList = [
	"bmp/cell_color0.bmp", 
	"bmp/cell_color1.bmp", 
	"bmp/cell_color2.bmp", 
	"bmp/cell_color3.bmp"
];

var gameCycle = {
	start: start
};

var cellSideSizeInPixels;

function start() {
	function sayHello() {
		var type = "WebGL";
		if (!PIXI.utils.isWebGLSupported()) {
			type = canvas;
		}
		PIXI.utils.sayHello(type);
	};
	sayHello();
	
	function resizeRenderer() {
		gl.view.style.position = "absolute";
		gl.view.style.display = "block";
		gl.autoResize = true;
		gl.resize(window.innerWidth, window.innerHeight);
	};
	resizeRenderer();
	document.body.appendChild(gl.view);
	
	function showProgress(loader, resource) {
		console.log("loading...");
		//TODO: Progress bar
		//loader.progress - progress in %
	};
	function emitPlayer() {
		cellSideSizeInPixels = new PIXI.Sprite(texture("bmp/cell_color0.bmp")).height / 2;
		socket.emit('new_player', {
			id: socket.id,
			//maybe smth else
		});
	};

	PIXI.loader
		.add(imagePathList)
		.on("progress", showProgress)
		.load(emitPlayer);

	gl.render(stage);
};

//TODO: map index should be stored at server
var mapOfChunks = [];
var chunkContainers = [];
var mapSizeInCells, mapWidthInChunks, mapHeightInChunks;

var CE;

var chunkWidthInCells, chunkHeightInCells;
var homeCell;
var boundsOnMapInPixels, focus;
//TODO: add socket.emit on server side
socket.on('gameDataSend', function(gameData) {
	console.log("game data send");

	function fillVarFromData() {
		mapSizeInCells = (1 << gameData.logSize) + 1;
		chunkWidthInCells = gameData.chunkWidth;
		chunkHeightInCells = gameData.chunkHeight;

		mapWidthInChunks = Math.ceil(mapSizeInCells / chunkWidthInCells);
		mapHeightInChunks = Math.ceil(mapSizeInCells / chunkHeightInCells);

		CE = new CoordsEnvironment(cellSideSizeInPixels, chunkWidthInCells, chunkHeightInCells);

		mapOfChunks = MapGen.buildChunked(gameData);
		homeCell = new CE.Offset(gameData.homeCell.row, gameData.homeCell.col);

		focus = homeCell.toPoint();
		let d = new CE.Point(window.innerWidth / 2, window.innerHeight / 2);
		boundsOnMapInPixels = {
			topLeft: focus.sub(d),
			botRigt: focus.add(d),
			pushFocus: function() {
				topLeft = focus.sub(d);
				botRigt = focus.add(d);
			}
		}
	};
	fillVarFromData();

	function fillSpriteArray() {
		for (let i = 0; i < mapWidthInChunks; ++i) {
			chunkContainers[i] = [];
			for (let j = 0; j < mapHeightInChunks; ++j) {
				fillSpriteContainer(i, j);
			}
		}
	};
	fillSpriteArray();
});

socket.on('chunkUpdated', function(chunk) {
	console.log("chunk updated");
	mapOfChunks[chunk.x][chunk.y] = chunk;
	fillSpriteContainer(chunk.x, chunk.y);
});

function fillSpriteContainer(i, j) {
	if (chunkContainers[i][j] != undefined)
		stage.removeChild(chunkContainers[i][j]);
	chunkContainers[i][j] = new PIXI.Container();

	function getPathsOfCellImage(i, j, x, y) {
		return [
			"bmp/cell_color" + mapOfChunks[i][j].res[x][y] + ".bmp",
			"bmp/building" + mapOfChunks[i][j].bui[x][y] + ".bmp"
		];
	};

	function getSpritesOfCell(i, j, x, y) {
		var strs = getPathsOfCellImage(i, j, x, y);
		var arr = [];
		strs.forEach(function(item, index, array) {
			arr.add(new PIXI.Sprite(texture(item)));
		});
		return arr;
	};

	for (let x = 0; x < chunkWidthInCells; ++x) {
		for (let y = 0; y < chunkHeightInCells; ++y) {
			//TODO: set coords of sprites
			var cellSprites = getSpritesOfCell(i, j, x, y);
			chunkContainers[i][j].addChild(cellSprites[0], cellSprites[1]);
		}
	}
	//TODO: set coords of chunk container
	stage.addChild(chunkContainers[i][j]);
};

//TODO: Event handling
//First - map move

var lastBounds;

function updRenderingBounds() {
	let bounds = getRenderingBounds();
	let x1 = lastBounds.x1,
		x2 = lastBounds.x2,
		y1 = lastBounds.y1,
		y2 = lastBounds.y2,

		tx1 = bounds.x1,
		tx2 = bounds.x2,
		ty1 = bounds.y1,
		ty2 = bounds.y2;

	with(Math) {
		setChunksVisible(x1, min(x2, tx1 - 1), y1, min(y2, ty1 - 1), false);
		setChunksVisible(max(x1, tx1), min(x2, tx2), y1, min(y2, ty1 - 1), false);
		setChunksVisible(max(x1, tx2 + 1), x2, y1, min(y2, ty1 - 1), false);
		setChunksVisible(x1, min(x2, tx1 - 1), max(y1, ty1), min(y2, ty2), false);
		setChunksVisible(max(x1, tx2 + 1), x2, max(y1, ty1), min(y2, ty2), false);
		setChunksVisible(x1, min(x2, tx1 - 1), max(y1, ty2 + 1), y2, false);
		setChunksVisible(max(x1, tx1), min(x2, tx2), max(y1, ty2 + 1), y2, false);
		setChunksVisible(max(x1, tx2 + 1), x2, max(y1, ty2 + 1), y2, false);

		setChunksVisible(tx1, min(tx2, x1 - 1), ty1, min(ty2, y1 - 1), true);
		setChunksVisible(max(tx1, x1), min(tx2, x2), ty1, min(ty2, y1 - 1), true);
		setChunksVisible(max(tx1, x2 + 1), tx2, ty1, min(ty2, y1 - 1), true);
		setChunksVisible(tx1, min(tx2, x1 - 1), max(ty1, y1), min(ty2, y2), true);
		setChunksVisible(max(tx1, x2 + 1), tx2, max(ty1, y1), min(ty2, y2), true);
		setChunksVisible(tx1, min(tx2, x1 - 1), max(ty1, y2 + 1), ty2, true);
		setChunksVisible(max(tx1, x1), min(tx2, x2), max(ty1, y2 + 1), ty2, true);
		setChunksVisible(max(tx1, x2 + 1), tx2, max(ty1, y2 + 1), ty2, true);
	}

	lastBounds = bounds;
};

function getRenderingBounds() {
	let tl = boundsOnMapInPixels.topLeft.toChunk(),
		br = boundsOnMapInPixels.botRigt.toChunk();
	return {x1: tl.getX(), x2: br.getX(), y1: tl.getY(), y2: br.getY()};
};

function setChunksVisible(x1, y1, x2, y2, value) {
	for (let x = x1; x <= x2; ++x)
		for (let y = y1; y <= y2; ++y)
			chunkContainers[y][x].visible = value;
};

gameCycle.start();