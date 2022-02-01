"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.game = void 0;
const p5_1 = __importDefault(require("p5"));
const Player_1 = __importDefault(require("./entities/Player"));
const EntityItem_1 = __importDefault(require("./entities/EntityItem"));
const World_1 = __importDefault(require("./world/World"));
const TileResource_1 = __importDefault(require("./assets/TileResource"));
/*
///INFORMATION
//Starting a game
Press Live Server to start the game
or
Type npm run prestart to start the game.
//TODO
When something in the todo section, either delete it and mark what was done in the description -
- when pushing, or just mark it like this
(example: Create a nuclear explosion -- X)
///GENERAL TODO:

//Audio
sounds
music
NPC's

//Visual
Update snow textures
Update GUI textures
player character
item lore implemented

//Gameplay
finish item management
pause menu
Hunger, heat, etc system
item creation
item use
Parent Workbench

//Objects
dirt
stone
workbench
backpack (used as chest)

//Polish
better world generation
font consistency
fix cursor input lag (separate cursor and animation images)
fix stuck on side of block bug
fix collide with sides of map bug

item management behavior todo:
merge
right click stack to pick up ceil(half of it)
right click when picked up to add 1 if 0 or match
craftables

*/
class Game extends p5_1.default {
    constructor() {
        super(() => { }); // To create a new instance of P5 it will callback with the instance. We don't need this since we are extending the class
        this.WORLD_WIDTH = 512; // width of the world in tiles
        this.WORLD_HEIGHT = 64; // height of the world in tiles
        this.TILE_WIDTH = 8; // width of a tile in pixels
        this.TILE_HEIGHT = 8; // height of a tile in pixels
        this.BACK_TILE_WIDTH = 12; // width of a tile in pixels
        this.BACK_TILE_HEIGHT = 12; // height of a tile in pixels
        this.TILE_SET_SIZE = 16; // number of tiles in the tile set (do not change this as parts of the program will break)
        this.backTileLayerOffsetWidth = -2; // calculated in the setup function, this variable is the number of pixels left of a tile to draw a background tile from at the same position
        this.backTileLayerOffsetHeight = -2; // calculated in the setup function, this variable is the number of pixels above a tile to draw a background tile from at the same position
        this.upscaleSize = 6; // number of screen pixels per texture pixels (think of this as hud scale in Minecraft)
        this.camX = 0; // position of the top left corner of the screen in un-up-scaled pixels (0 is left of world) (WORLD_WIDTH*TILE_WIDTH is bottom of world)
        this.camY = 0; // position of the top left corner of the screen in un-up-scaled pixels (0 is top of world) (WORLD_HEIGHT*TILE_HEIGHT is bottom of world)
        this.pCamX = 0; // last frame's x of the camera
        this.pCamY = 0; // last frame's y of the camera
        this.interpolatedCamX = 0; // interpolated position of the camera
        this.interpolatedCamY = 0; // interpolated position of the camera
        // tick management
        this.msSinceTick = 0; // this is the running counter of how many milliseconds it has been since the last tick.  The game can then
        this.msPerTick = 20; // the number of milliseconds per game tick.  1000/msPerTick = ticks per second
        this.amountSinceLastTick = 0; // this is a variable calculated every frame used for interpolation - domain[0,1)
        this.forgivenessCount = 50; // if the computer needs to do more than 50 ticks in a single frame, then it could be running behind, probably because of a freeze or the user being on a different tab.  In these cases, it's probably best to just ignore that any time has passed to avoid further freezing
        // physics constants
        this.GRAVITY_SPEED = 0.04; // in units per second tick, positive means downward gravity, negative means upward gravity
        this.DRAG_COEFFICIENT = 0.21; // arbitrary number, 0 means no drag
        // array for all the items
        this.items = [];
        // CHARACTER SHOULD BE ROUGHLY 12 PIXELS BY 20 PIXELS
        this.TILE_SET_POSITIONS = [
            undefined,
            0,
            1, // ice
        ];
        this.TILE_BROKEN = [
            // what drops when you break a tile
            // [broken, broken_quantity]
            [undefined, undefined],
            [4, 4],
            [5, 4],
        ];
        this.ITEM_DATA = [
            // ["name", "description", #stackSize]
            [undefined, undefined, Infinity],
            ['Snowberries', 'Tasty.', 100],
            ['Snow Tile', 'Can be placed.', 1000],
            ['Ice Tile', 'Can be placed.', 1000],
            [
                'Snowball',
                'Can be thrown or 4 can be compacted to make Snow Tile.',
                1000,
            ],
            ['Ice Shards', '4 can be compacted to make Ice Tile.', 1000],
        ];
        // const FRICTION_CONSTANTS = [
        //     0,              //air
        //     0.3,                      //snow
        //     0.05,                      //ice
        // ];
        this.hotBar = [
            [1, 5],
            [0, 0],
            [1, 90],
            [1, 100],
            [1, 8],
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0],
        ];
        this.selectedSlot = 0;
        this.pickedUpSlot = -1;
        this.worldMouseX = 0; // the mouse position in world coordinates
        this.worldMouseY = 0; // the mouse position in world coordinates
        this.mouseOn = true; // is the mouse on the window?
        this.keys = [];
        // world info
        this.isSnowing = true;
        // performance
        this.particleMultiplier = 1.0;
        // maybe add particle interpolation.
        // particle layers
        this.backgroundParticles = [];
        this.foregroundParticles = [];
        // cursor stuff
        this.cursorAnimFrame = 0;
        this.msSinceCursorAnimFrame = 0;
        this.msPerCursorAnimFrame = 100;
        this.cursorIndex = 1;
        // the keycode for the key that does the action
        this.controls = [
            68,
            65,
            87,
            27,
            69,
            49,
            50,
            51,
            52,
            52,
            54,
            55,
            56,
            57,
            48,
            189,
            187, // hot bar 12
        ];
    }
    preload() {
        console.log('Loading assets');
        this.assets = {
            tileSetImage: new TileResource_1.default(32, 1, 8, 8, this.loadImage('assets/textures/tilesets/middleground/indexedtileset.png')),
            backgroundTileSetImage: this.loadImage('assets/textures/tilesets/background/backgroundsnow.png'),
            uiSlotImage: this.loadImage('assets/textures/ui/uislot.png'),
            selectedUISlotImage: this.loadImage('assets/textures/ui/selecteduislot.png'),
            itemsImage: this.loadImage('assets/textures/items/items.png'),
            TitleFont: this.loadFont('assets/fonts/Cave-Story.ttf'),
            snowflakeImage: this.loadImage('assets/textures/particles/snowflakes.png'),
            uiFrame: this.loadImage('assets/textures/ui/uiframe.png'),
            // load the cursor images
            cursors: [
                [this.loadImage('assets/textures/cursors/cursor.png')],
                [
                    this.loadImage('assets/textures/cursors/cursor_dig_0.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_1.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_2.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_3.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_4.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_5.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_6.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_7.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_8.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_9.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_10.png'),
                    this.loadImage('assets/textures/cursors/cursor_dig_11.png'),
                ],
            ],
        };
        console.log('Asset loading completed');
    }
    setup() {
        // make a canvas that fills the whole screen (a canvas is what is drawn to in p5.js, as well as lots of other JS rendering libraries)
        this.canvas = this.createCanvas(this.windowWidth, this.windowHeight);
        this.canvas.mouseOut(this.mouseExited);
        this.canvas.mouseOver(this.mouseEntered);
        this.world = new World_1.default(this.WORLD_WIDTH, this.WORLD_HEIGHT);
        this.player = new Player_1.default(16, 4, 12 / this.TILE_WIDTH, 20 / this.TILE_HEIGHT, 0, 0);
        // go for a scale of <64 tiles wide screen
        this.upscaleSize =
            this.ceil(this.windowWidth / 64 / this.TILE_WIDTH / 2) * 2;
        // if the world is too zoomed out, then zoom it in.
        while (this.WORLD_WIDTH * this.TILE_WIDTH - this.width / this.upscaleSize <
            0 ||
            this.WORLD_HEIGHT * this.TILE_HEIGHT -
                this.height / this.upscaleSize <
                0) {
            this.upscaleSize += 2;
        }
        // turn off the cursor image
        // this.noCursor();
        // remove texture interpolation
        this.noSmooth();
        // generate and draw the world onto the p5.Graphics objects
        this.world.generateWorld();
        // the highest keycode is 255, which is "Toggle Touchpad", according to keycode.info
        for (let i = 0; i < 255; i++) {
            this.keys.push(false);
        }
        this.updatePickUpAbleItems();
        // set the framerate goal to as high as possible (this will end up capping to your monitor's refresh rate.)
        this.frameRate(Infinity);
    }
    /*$$$$$$$\                                         $$\
      $$  __$$\                                        $$ |
      $$ |  $$ | $$$$$$\  $$$$$$\  $$\  $$\  $$\       $$ |      $$$$$$\   $$$$$$\   $$$$$$\  $$\
      $$ |  $$ |$$  __$$\ \____$$\ $$ | $$ | $$ |      $$ |     $$  __$$\ $$  __$$\ $$  __$$\ \__|
      $$ |  $$ |$$ |  \__|$$$$$$$ |$$ | $$ | $$ |      $$ |     $$ /  $$ |$$ /  $$ |$$ /  $$ |
      $$ |  $$ |$$ |     $$  __$$ |$$ | $$ | $$ |      $$ |     $$ |  $$ |$$ |  $$ |$$ |  $$ |$$\
      $$$$$$$  |$$ |     \$$$$$$$ |\$$$$$\$$$$  |      $$$$$$$$\\$$$$$$  |\$$$$$$  |$$$$$$$  |\__|
      \_______/ \__|      \_______| \_____\____/       \________|\______/  \______/ $$  ____/
                                                                                    $$ |
                                                                                    $$ |
                                                                                    \__|          */
    draw() {
        // console.time("frame");
        // wipe the screen with a happy little layer of light blue
        this.background(129, 206, 243);
        // do the tick calculations
        this.doTicks();
        // update mouse position
        this.updateMouse();
        // update the camera's interpolation
        this.moveCamera();
        // draw the background tile layer onto the screen
        this.image(this.world.backTileLayer, 0, 0, this.width, this.height, this.interpolatedCamX * this.TILE_WIDTH, this.interpolatedCamY * this.TILE_WIDTH, this.width / this.upscaleSize, this.height / this.upscaleSize);
        // draw the tile layer onto the screen
        this.image(this.world.tileLayer, 0, 0, this.width, this.height, this.interpolatedCamX * this.TILE_WIDTH, this.interpolatedCamY * this.TILE_WIDTH, this.width / this.upscaleSize, this.height / this.upscaleSize);
        this.uiFrameRect(this.mouseX, this.mouseY, 100, 100);
        // render the player, all items, etc.  Basically any physicsRect or particle
        this.renderEntities();
        // draw the hot bar
        this.noStroke();
        this.textAlign(this.RIGHT, this.BOTTOM);
        this.textSize(5 * this.upscaleSize);
        for (let i = 0; i < this.hotBar.length; i++) {
            if (this.selectedSlot === i) {
                this.image(this.assets.selectedUISlotImage, 2 * this.upscaleSize + 16 * i * this.upscaleSize, 2 * this.upscaleSize, 16 * this.upscaleSize, 16 * this.upscaleSize);
            }
            else {
                this.image(this.assets.uiSlotImage, 2 * this.upscaleSize + 16 * i * this.upscaleSize, 2 * this.upscaleSize, 16 * this.upscaleSize, 16 * this.upscaleSize);
            }
            if (this.hotBar[i][0] !== 0) {
                this.fill(0);
                if (this.pickedUpSlot === i) {
                    if (this.hotBar[i][1] > 1) {
                        this.text(this.hotBar[i][1], this.mouseX + 16 * this.upscaleSize, this.mouseY + 16 * this.upscaleSize);
                    }
                    this.tint(255, 127);
                    this.fill(0, 127);
                }
                this.image(this.assets.itemsImage, 6 * this.upscaleSize + 16 * i * this.upscaleSize, 6 * this.upscaleSize, 8 * this.upscaleSize, 8 * this.upscaleSize, 8 * this.hotBar[i][0] - 8, 0, 8, 8);
                if (this.hotBar[i][1] > 1) {
                    this.text(this.hotBar[i][1], 16 * this.upscaleSize + 16 * i * this.upscaleSize, 16 * this.upscaleSize);
                }
                this.noTint();
            }
        }
        // draw the cursor
        // this.drawCursor();
        // console.timeEnd("frame");
    }
    windowResized() {
        this.resizeCanvas(this.windowWidth, this.windowHeight);
        // go for a scale of <64 tiles wide screen
        this.upscaleSize =
            this.ceil(this.windowWidth / 64 / this.TILE_WIDTH / 2) * 2;
        // if the world is too zoomed out, then zoom it in.
        while (this.WORLD_WIDTH * this.TILE_WIDTH - this.width / this.upscaleSize <
            0 ||
            this.WORLD_HEIGHT * this.TILE_HEIGHT -
                this.height / this.upscaleSize <
                0) {
            this.upscaleSize += 2;
        }
    }
    keyPressed() {
        this.keys[this.keyCode] = true;
        if (this.controls.includes(this.keyCode)) {
            // hot bar slots
            for (let i = 0; i < 12; i++) {
                if (this.keyCode === this.controls[i + 5]) {
                    if (this.mouseX > 2 * this.upscaleSize &&
                        this.mouseX <
                            2 * this.upscaleSize +
                                16 * this.upscaleSize * this.hotBar.length &&
                        this.mouseY > 2 * this.upscaleSize &&
                        this.mouseY < 18 * this.upscaleSize) {
                        const temp = this.hotBar[i];
                        this.hotBar[i] =
                            this.hotBar[this.floor((this.mouseX - 2 * this.upscaleSize) /
                                16 /
                                this.upscaleSize)];
                        this.hotBar[this.floor((this.mouseX - 2 * this.upscaleSize) /
                            16 /
                            this.upscaleSize)] = temp;
                    }
                    else
                        this.selectedSlot = i;
                    return;
                }
            }
            if (this.keyCode === this.controls[4]) {
                console.log('Inventory opened');
            }
        }
    }
    keyReleased() {
        this.keys[this.keyCode] = false;
    }
    mousePressed() {
        // image(uiSlotImage, 2*upscaleSize+16*i*upscaleSize, 2*upscaleSize, 16*upscaleSize, 16*upscaleSize);
        if (this.mouseX > 2 * this.upscaleSize &&
            this.mouseX <
                2 * this.upscaleSize +
                    16 * this.upscaleSize * this.hotBar.length &&
            this.mouseY > 2 * this.upscaleSize &&
            this.mouseY < 18 * this.upscaleSize) {
            if (this.pickedUpSlot === -1) {
                if (this.hotBar[this.floor((this.mouseX - 2 * this.upscaleSize) /
                    16 /
                    this.upscaleSize)][0] !== 0) {
                    this.pickedUpSlot = this.floor((this.mouseX - 2 * this.upscaleSize) /
                        16 /
                        this.upscaleSize);
                }
            }
            else {
                const temp = this.hotBar[this.pickedUpSlot];
                this.hotBar[this.pickedUpSlot] =
                    this.hotBar[this.floor((this.mouseX - 2 * this.upscaleSize) /
                        16 /
                        this.upscaleSize)];
                this.pickedUpSlot = -1;
                this.hotBar[this.floor((this.mouseX - 2 * this.upscaleSize) /
                    16 /
                    this.upscaleSize)] = temp;
            }
        }
        else {
            this.dropItem(this.TILE_BROKEN[this.world.worldTiles[this.WORLD_WIDTH * this.worldMouseY + this.worldMouseX]][0], this.TILE_BROKEN[this.world.worldTiles[this.WORLD_WIDTH * this.worldMouseY + this.worldMouseX]][1], this.worldMouseX, this.worldMouseY);
            // set the broken tile to air in the world data
            this.world.worldTiles[this.WORLD_WIDTH * this.worldMouseY + this.worldMouseX] = 0;
            // erase the broken tile and its surrounding tiles using two erasing rectangles in a + shape
            this.world.tileLayer.erase();
            this.world.tileLayer.noStroke();
            this.world.tileLayer.rect((this.worldMouseX - 1) * this.TILE_WIDTH, this.worldMouseY * this.TILE_HEIGHT, this.TILE_WIDTH * 3, this.TILE_HEIGHT);
            this.world.tileLayer.rect(this.worldMouseX * this.TILE_WIDTH, (this.worldMouseY - 1) * this.TILE_HEIGHT, this.TILE_WIDTH, this.TILE_HEIGHT * 3);
            this.world.tileLayer.noErase();
            // redraw the neighboring tiles
            this.drawTile(this.worldMouseX + 1, this.worldMouseY);
            this.drawTile(this.worldMouseX - 1, this.worldMouseY);
            this.drawTile(this.worldMouseX, this.worldMouseY + 1);
            this.drawTile(this.worldMouseX, this.worldMouseY - 1);
        }
    }

    mouseReleased() {
        if (this.pickedUpSlot !== -1) {
            if (!(this.mouseX > 2 * this.upscaleSize &&
                this.mouseX <
                    2 * this.upscaleSize +
                        16 * this.upscaleSize * this.hotBar.length &&
                this.mouseY > 2 * this.upscaleSize &&
                this.mouseY < 18 * this.upscaleSize)) {
                this.dropItem(this.hotBar[this.pickedUpSlot][0], this.hotBar[this.pickedUpSlot][1], (this.interpolatedCamX * this.TILE_WIDTH +
                    this.mouseX / this.upscaleSize) /
                    this.TILE_WIDTH, (this.interpolatedCamY * this.TILE_HEIGHT +
                    this.mouseY / this.upscaleSize) /
                    this.TILE_HEIGHT);
                this.hotBar[this.pickedUpSlot] = [0, 0];
                this.pickedUpSlot = -1;
            }
            else if (this.floor((this.mouseX - 2 * this.upscaleSize) / 16 / this.upscaleSize) !== this.pickedUpSlot) {
                const temp = this.hotBar[this.pickedUpSlot];
                this.hotBar[this.pickedUpSlot] =
                    this.hotBar[this.floor((this.mouseX - 2 * this.upscaleSize) /
                        16 /
                        this.upscaleSize)];
                this.pickedUpSlot = -1;
                this.hotBar[this.floor((this.mouseX - 2 * this.upscaleSize) /
                    16 /
                    this.upscaleSize)] = temp;
            }
        }
    }
    moveCamera() {
        this.interpolatedCamX =
            this.pCamX + (this.camX - this.pCamX) * this.amountSinceLastTick;
        this.interpolatedCamY =
            this.pCamY + (this.camY - this.pCamY) * this.amountSinceLastTick;
    }
    drawTile(j, i) {
        if (this.world.worldTiles[i * this.WORLD_WIDTH + j] !== 0) {
            // test if the neighboring tiles are solid
            const topTileBool = i === 0 ||
                this.world.worldTiles[(i - 1) * this.WORLD_WIDTH + j] !== 0;
            const leftTileBool = j === 0 ||
                this.world.worldTiles[i * this.WORLD_WIDTH + j - 1] !== 0;
            const bottomTileBool = i === this.WORLD_HEIGHT - 1 ||
                this.world.worldTiles[(i + 1) * this.WORLD_WIDTH + j] !== 0;
            const rightTileBool = j === this.WORLD_WIDTH - 1 ||
                this.world.worldTiles[i * this.WORLD_WIDTH + j + 1] !== 0;
            // convert 4 digit binary number to base 10
            const tileSetIndex = 8 * +topTileBool +
                4 * +rightTileBool +
                2 * +bottomTileBool +
                +leftTileBool;
            // draw the correct image for the tile onto the tile layer
            this.assets.tileSetImage
                .getTile(tileSetIndex)
                .render(this.world.tileLayer, j * this.TILE_WIDTH, i * this.TILE_HEIGHT, this.TILE_WIDTH, this.TILE_HEIGHT);
        }
    }
    // function keyReleased() {
    //     ts++;
    // }
    doTicks() {
        // increase the time since a tick has happened by deltaTime, which is a built-in p5.js value
        this.msSinceTick += this.deltaTime;
        // define a temporary variable called ticksThisFrame - this is used to keep track of how many ticks have been calculated within the duration of the current frame.  As long as this value is less than the forgivenessCount variable, it continues to calculate ticks as necessary.
        let ticksThisFrame = 0;
        while (this.msSinceTick > this.msPerTick &&
            ticksThisFrame !== this.forgivenessCount) {
            // console.time("tick");
            this.doTick();
            // console.timeEnd("tick");
            this.msSinceTick -= this.msPerTick;
            ticksThisFrame++;
        }
        if (ticksThisFrame === this.forgivenessCount) {
            this.msSinceTick = 0;
            console.warn("lag spike detected, tick calculations couldn't keep up");
        }
        this.amountSinceLastTick = this.msSinceTick / this.msPerTick;
    }
    doTick() {
        this.player.keyboardInput();
        this.player.applyGravityAndDrag();
        this.player.applyVelocityAndCollide();
        this.pCamX = this.camX;
        this.pCamY = this.camY;
        const desiredCamX = this.player.x +
            this.player.w / 2 -
            this.width / 2 / this.TILE_WIDTH / this.upscaleSize +
            this.player.xVel * 40;
        const desiredCamY = this.player.y +
            this.player.h / 2 -
            this.height / 2 / this.TILE_HEIGHT / this.upscaleSize +
            this.player.yVel * 20;
        this.camX = (desiredCamX + this.camX * 24) / 25;
        this.camY = (desiredCamY + this.camY * 24) / 25;
        if (this.camX < 0) {
            this.camX = 0;
        }
        else if (this.camX >
            this.WORLD_WIDTH - this.width / this.upscaleSize / this.TILE_WIDTH) {
            this.camX =
                this.WORLD_WIDTH -
                    this.width / this.upscaleSize / this.TILE_WIDTH;
        }
        if (this.camY >
            this.WORLD_HEIGHT -
                this.height / this.upscaleSize / this.TILE_HEIGHT) {
            this.camY =
                this.WORLD_HEIGHT -
                    this.height / this.upscaleSize / this.TILE_HEIGHT;
        }
        for (const item of this.backgroundParticles) {
            item.updatePhysics();
        }
        for (const item of this.foregroundParticles) {
            item.updatePhysics();
        }
        for (const item of this.items) {
            item.goTowardsPlayer();
            item.applyGravityAndDrag();
            item.applyVelocityAndCollide();
        }
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].deleted === true) {
                this.items.splice(i, 1);
                i--;
            }
        }
    }
    uiFrameRect(x, y, w, h) {
        this.rect(x, y, w, h);
        // corners
        this.image(this.assets.uiFrame, x, y, 7 * this.upscaleSize, 7 * this.upscaleSize, 0, 0, 7, 7);
        this.image(this.assets.uiFrame, x + w - 7 * this.upscaleSize, y, 7 * this.upscaleSize, 7 * this.upscaleSize, 6, 0, 7, 7);
        this.image(this.assets.uiFrame, x, y + h - 7 * this.upscaleSize, 7 * this.upscaleSize, 7 * this.upscaleSize, 0, 6, 7, 7);
        this.image(this.assets.uiFrame, x + w - 7 * this.upscaleSize, y + h - 7 * this.upscaleSize, 7 * this.upscaleSize, 7 * this.upscaleSize, 6, 6, 7, 7);
        // top and bottom
        this.image(this.assets.uiFrame, x + 7 * this.upscaleSize, y, w - 14 * this.upscaleSize, 7 * this.upscaleSize, 6, 0, 1, 7);
        this.image(this.assets.uiFrame, x + 7 * this.upscaleSize, y + h - 7 * this.upscaleSize, w - 14 * this.upscaleSize, 7 * this.upscaleSize, 6, 6, 1, 7);
        // left and right
        this.image(this.assets.uiFrame, x, y + 7 * this.upscaleSize, 7 * this.upscaleSize, h - 14 * this.upscaleSize, 0, 6, 7, 1);
        this.image(this.assets.uiFrame, x + w - 7 * this.upscaleSize, y + 7 * this.upscaleSize, 7 * this.upscaleSize, h - 14 * this.upscaleSize, 6, 6, 7, 1);
        // center
        this.image(this.assets.uiFrame, x + 7 * this.upscaleSize, y + 7 * this.upscaleSize, w - 14 * this.upscaleSize, h - 14 * this.upscaleSize, 7, 7, 1, 1);
    }
    /*
   /$$$$$$$  /$$                           /$$
  | $$__  $$| $$                          |__/
  | $$  \ $$| $$$$$$$  /$$   /$$  /$$$$$$$ /$$  /$$$$$$$  /$$$$$$$ /$$
  | $$$$$$$/| $$__  $$| $$  | $$ /$$_____/| $$ /$$_____/ /$$_____/|__/
  | $$____/ | $$  \ $$| $$  | $$|  $$$$$$ | $$| $$      |  $$$$$$
  | $$      | $$  | $$| $$  | $$ \____  $$| $$| $$       \____  $$ /$$
  | $$      | $$  | $$|  $$$$$$$ /$$$$$$$/| $$|  $$$$$$$ /$$$$$$$/|__/
  |__/      |__/  |__/ \____  $$|_______/ |__/ \_______/|_______/
                       /$$  | $$
                      |  $$$$$$/
                       \______/
  */
    // this class holds an axis-aligned rectangle affected by gravity, drag, and collisions with tiles.
    rectVsRay(rectX, rectY, rectW, rectH, rayX, rayY, rayW, rayH) {
        // this ray is actually a line segment mathematically, but it's common to see people refer to similar checks as ray-casts, so for the duration of the definition of this function, ray can be assumed to mean the same as line segment.
        // if the ray doesn't have a length, then it can't have entered the rectangle.  This assumes that the objects don't start in collision, otherwise they'll behave strangely
        if (rayW === 0 && rayH === 0) {
            return false;
        }
        // calculate how far along the ray each side of the rectangle intersects with it (each side is extended out infinitely in both directions)
        const topIntersection = (rectY - rayY) / rayH;
        const bottomIntersection = (rectY + rectH - rayY) / rayH;
        const leftIntersection = (rectX - rayX) / rayW;
        const rightIntersection = (rectX + rectW - rayX) / rayW;
        if (isNaN(topIntersection) ||
            isNaN(bottomIntersection) ||
            isNaN(leftIntersection) ||
            isNaN(rightIntersection)) {
            // you have to use the JS function isNaN() to check if a value is NaN because both NaN==NaN and NaN===NaN are false.
            // if any of these values are NaN, no collision has occurred
            return false;
        }
        // calculate the nearest and farthest intersections for both x and y
        const nearX = this.min(leftIntersection, rightIntersection);
        const farX = this.max(leftIntersection, rightIntersection);
        const nearY = this.min(topIntersection, bottomIntersection);
        const farY = this.max(topIntersection, bottomIntersection);
        if (nearX > farY || nearY > farX) {
            // this must mean that the line that makes up the line segment doesn't pass through the ray
            return false;
        }
        if (farX < 0 || farY < 0) {
            // the intersection is happening before the ray starts, so the ray is pointing away from the triangle
            return false;
        }
        // calculate where the potential collision could be
        const nearCollisionPoint = this.max(nearX, nearY);
        if (nearX > 1 || nearY > 1) {
            // the intersection happens after the ray(line segment) ends
            return false;
        }
        if (nearX === nearCollisionPoint) {
            // it must have collided on either the left or the right! now which?
            if (leftIntersection === nearX) {
                // It must have collided on the left!  Return the collision normal [-1, 0]
                return [-1, 0, nearCollisionPoint];
            }
            // If it didn't collide on the left, it must have collided on the right.  Return the collision normal [1, 0]
            return [1, 0, nearCollisionPoint];
        }
        // If it didn't collide on the left or right, it must have collided on either the top or the bottom! now which?
        if (topIntersection === nearY) {
            // It must have collided on the top!  Return the collision normal [0, -1]
            return [0, -1, nearCollisionPoint];
        }
        // If it didn't collide on the top, it must have collided on the bottom.  Return the collision normal [0, 1]
        return [0, 1, nearCollisionPoint];
        // output if no collision: false
        // output if collision: [collision normal X, collision normal Y, nearCollisionPoint]
        //                         -1 to 1              -1 to 1            0 to 1
    }
    renderEntities() {
        // draw player
        this.fill(255, 0, 0);
        this.noStroke();
        this.player.findInterpolatedCoordinates();
        this.rect((this.player.interpolatedX * this.TILE_WIDTH -
            this.interpolatedCamX * this.TILE_WIDTH) *
            this.upscaleSize, (this.player.interpolatedY * this.TILE_HEIGHT -
            this.interpolatedCamY * this.TILE_HEIGHT) *
            this.upscaleSize, this.player.w * this.upscaleSize * this.TILE_WIDTH, this.player.h * this.upscaleSize * this.TILE_HEIGHT);
        for (const item of this.items) {
            item.findInterpolatedCoordinates();
            this.image(this.assets.itemsImage, (item.interpolatedX * this.TILE_WIDTH -
                this.interpolatedCamX * this.TILE_WIDTH) *
                this.upscaleSize, (item.interpolatedY * this.TILE_HEIGHT -
                this.interpolatedCamY * this.TILE_HEIGHT) *
                this.upscaleSize, item.w * this.upscaleSize * this.TILE_WIDTH, item.h * this.upscaleSize * this.TILE_HEIGHT, 8 * item.itemType - 8, 0, 8, 8);
        }
    }
    dropItem(type, count, x, y) {
        for (let i = 0; i < count; i++) {
            this.items.push(new EntityItem_1.default(x, y, 0.5, 0.5, this.random(-0.1, 0.1), this.random(-0.1, 0)));
            this.items[this.items.length - 1].itemType = type;
        }
    }
    pickUpItem(type) {
        // see if there is already a stack of this item in the hot bar, if so, check if it's less than the max stack size, if so, then add it to the stack
        for (const item of this.hotBar) {
            if (item[0] === type && item[1] < this.ITEM_DATA[type][2]) {
                item[1]++;
                // if the stack is full, then the possible items to pick up have changed.
                if (item[1] === this.ITEM_DATA[type][2]) {
                    this.updatePickUpAbleItems();
                }
                return;
            }
        }
        // see if there is a blank slot in the hot bar
        for (let i = 0; i < this.hotBar.length; i++) {
            if (this.hotBar[i][0] === 0) {
                this.hotBar[i] = [type, 1];
                this.updatePickUpAbleItems();
                return;
            }
        }
        console.error('EntityItem ' +
            type +
            " couldn't be picked up.  The program shouldn't have tried to pick it up in the first place.");
    }
    updatePickUpAbleItems() {
        this.pickUpAbleItems = [];
        outerLoop: for (let i = 0; i < this.ITEM_DATA.length; i++) {
            // see if there is already a stack of this item in the hot bar, if so, check if it's less than the max stack size
            for (const item of this.hotBar) {
                if (item[0] === i && item[1] < this.ITEM_DATA[i][2]) {
                    this.pickUpAbleItems.push(true);
                    continue outerLoop;
                }
            }
            // see if there is a blank slot in the hot bar
            for (const item of this.hotBar) {
                if (item[0] === 0) {
                    this.pickUpAbleItems.push(true);
                    continue outerLoop;
                }
            }
            this.pickUpAbleItems.push(false);
        }
    }
    mouseExited() {
        this.mouseOn = false;
    }
    mouseEntered() {
        this.mouseOn = true;
    }
    updateMouse() {
        // world mouse x and y variables hold the mouse position in world tiles.  0, 0 is top left
        this.worldMouseX = this.floor((this.interpolatedCamX * this.TILE_WIDTH +
            this.mouseX / this.upscaleSize) /
            this.TILE_WIDTH);
        this.worldMouseY = this.floor((this.interpolatedCamY * this.TILE_HEIGHT +
            this.mouseY / this.upscaleSize) /
            this.TILE_HEIGHT);
    }
    drawCursor() {
        if (this.mouseOn) {
            // don't do anything if the mouse isn't on the screen
            // increase the time since an animFrame has happened by deltaTime, which is a built-in p5.js value
            this.msSinceCursorAnimFrame += this.deltaTime;
            this.cursorAnimFrame += this.floor(this.msSinceCursorAnimFrame / this.msPerCursorAnimFrame);
            this.msSinceCursorAnimFrame -=
                this.msPerCursorAnimFrame *
                    this.floor(this.msSinceCursorAnimFrame / this.msPerCursorAnimFrame);
            this.cursorAnimFrame =
                this.cursorAnimFrame %
                    this.assets.cursors[this.cursorIndex].length;
            this.image(this.assets.cursors[this.cursorIndex][this.cursorAnimFrame], this.mouseX, this.mouseY);
        }
        if (this.pickedUpSlot > -1) {
            this.image(this.assets.itemsImage, this.mouseX + 6 * this.upscaleSize, this.mouseY + 6 * this.upscaleSize, 8 * this.upscaleSize, 8 * this.upscaleSize, 8 * this.hotBar[this.pickedUpSlot][0] - 8, 0, 8, 8);
        }
    }
}
const game = new Game();
exports.game = game;
//# sourceMappingURL=Main.js.map