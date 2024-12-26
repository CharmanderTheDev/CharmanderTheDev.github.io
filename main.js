const prod = true;

const mainBody = document.getElementById('main-body');
const c = document.getElementById('canvas');
const ctx = c.getContext("2d");

//hidden canvas context
const hctx = document.createElement('canvas').getContext('2d');

var spriteBank = new Map();

var tick = 0;

const current_chunk_tiles = [
    [false, false, false],
    [false, false, false],
    [false, false, false]
];

const current_chunk_entities = [
    [false, false, false],
    [false, false, false],
    [false, false, false]
];

const chunk_size = 4096;

var inputState = {
    up:false,
    down:false,
    left:false,
    right:false,

    turnright:false,
    turnleft:false,

    space:false,
}

var playerState = {
    direction: 0,
    walking_frame: 0,
    
    position: {x:2048,y:1152},

    facing_angle: 0,

    current_chunk: {x:0,y:0},
};const PLAYERSPEED = 32;

document.addEventListener('keydown', (event) => {
    if(event.key == 'w'){inputState.up=true;}
    if(event.key == 's'){inputState.down=true;}
    if(event.key == 'a'){inputState.left=true;}
    if(event.key == 'd'){inputState.right=true;}

    if(event.key == 'e'){inputState.turnright=true;}
    if(event.key == 'q'){inputState.turnleft=true;}

    if(event.key == ' '){inputState.space=true;}

    if(event.key == 'z'){ctx.resetTransform();playerState.facing_angle=0;}
})

document.addEventListener('keyup', (event) => {
    if(event.key == 'w'){inputState.up=false;}
    if(event.key == 's'){inputState.down=false;}
    if(event.key == 'a'){inputState.left=false;}
    if(event.key == 'd'){inputState.right=false;}

    if(event.key == 'e'){inputState.turnright=false;}
    if(event.key == 'q'){inputState.turnleft=false;}

    if(event.key == ' '){inputState.space=false;}
})

function ELog(errorText) {
    const errorBoxDiv = document.getElementById('error-box');
    const errorSpan = document.createElement('p');
    errorSpan.innerText = errorText;
    errorBoxDiv.appendChild(errorSpan);
    console.error(errorText);
}
function Log(text) {
    const logBoxDiv = document.getElementById('logs');
    const logSpan = document.createElement('p');
    logSpan.innerText = text;
    logBoxDiv.appendChild(logSpan);
}
function QLog() {
    const logBoxDiv = document.getElementById('logs');
    const logSpan = document.createElement('p');
    logSpan.innerText = "Log Successful";
    logBoxDiv.appendChild(logSpan);
}
function LogC(){
    document.getElementById('logs').textContent = '';
}

const loadImage = path => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous' // to avoid CORS if used with Canvas
        img.src = path
        img.onload = () => {
            resolve(img)
        }
        img.onerror = e => {
            reject(e)
        }
    })
}

async function loadImages() {
    await fetch('/sprites/spritelist.txt')
    .then(response => response.text())
    .then(async (data) => {
        for(const line of data.split("\n")){
            spriteBank.set(
                line.slice(
                    line.lastIndexOf('/') + 1,
                    line.indexOf('.')
                ),
                await loadImage("/sprites"+line)
            );
        }
    });
}

async function updatePlayer() {
    //movement
    if(inputState.up){
        playerState.position.y+=Math.cos(playerState.facing_angle)*PLAYERSPEED;
        playerState.position.x+=Math.sin(playerState.facing_angle)*PLAYERSPEED;
        playerState.direction=2}
    if(inputState.down){
        playerState.position.y-=Math.cos(playerState.facing_angle)*PLAYERSPEED;
        playerState.position.x-=Math.sin(playerState.facing_angle)*PLAYERSPEED;
        playerState.direction=0}
    if(inputState.left){
        playerState.position.y-=Math.sin(playerState.facing_angle)*PLAYERSPEED;
        playerState.position.x+=Math.cos(playerState.facing_angle)*PLAYERSPEED;
        playerState.direction=3}
    if(inputState.right){
        playerState.position.y+=Math.sin(playerState.facing_angle)*PLAYERSPEED;
        playerState.position.x-=Math.cos(playerState.facing_angle)*PLAYERSPEED;
        playerState.direction=1}
    
    //walking frames
    if(inputState.left||inputState.right){
        if(tick%7===0){playerState.walking_frame=playerState.walking_frame===3?0:playerState.walking_frame+1;}
    }else if(inputState.up||inputState.down) {
        if(tick%7===0){playerState.walking_frame=playerState.walking_frame===1?3:1}
    }else{playerState.walking_frame=0;}

    //turning the camera
    if(inputState.turnleft){
        ctx.translate(c.width/2, c.height/2);
        ctx.rotate(.025);
        playerState.facing_angle+=.025;
        ctx.translate(-(c.width/2), -(c.height/2));
    }
    if(inputState.turnright){
        ctx.translate(c.width/2, c.height/2);
        ctx.rotate(-.025);
        playerState.facing_angle-=.025;
        ctx.translate(-(c.width/2), -(c.height/2));
    }

    //Drawing the player using the walking spritesheet
    drawRotatedCroppedImage(
        spriteBank.get("character_walksheet"), 
        128*playerState.direction, 128*(playerState.walking_frame>1?(playerState.walking_frame===2?0:2):playerState.walking_frame), 
        128, 128, //
        (c.width/2), (c.height/2), //position of image
        128, 128, //width and height of image
        -playerState.facing_angle //compensate for angle to maintain uprightness
    );

    //updating the player chunk if it's different, and loading new chunks
    if(Math.floor(playerState.position.x/chunk_size)!=playerState.current_chunk.x||Math.floor(playerState.position.y/chunk_size)!=playerState.current_chunk.y){

        playerState.current_chunk.x = -1*Math.floor(playerState.position.x/chunk_size);
        playerState.current_chunk.y = -1*Math.floor(playerState.position.y/chunk_size);

        await loadChunks();
    }
}

function drawRotatedImage(image, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(image, -(image.width/2), -(image.height/2));
    ctx.restore();
}

function drawRotatedCroppedImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, angle) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(angle);
    ctx.drawImage(image, sx, sy, sWidth, sHeight, -dWidth/2, -dHeight/2, dWidth, dHeight);
    ctx.restore();
}

async function loadChunks() {
    //building in-scope chunk dictionaries
    for(let y=-1;y<=1;y++){
        for(let x=-1;x<=1;x++) {

            await fetch("/chunk_data/keys/"+(playerState.current_chunk.x+x)+"/"+(playerState.current_chunk.y+y)+".txt")
            .then(response => response.text())
            .then(async (data) => {

                data = data.replace(/\s/g,'').split('}');

                //builds tilemap for given chunk
                current_chunk_tiles[1-y][x+1] = data[0][0]=='{'?await(async() => {
                    //will hold tiles for chunk
                    var tiles = []

                    //holds key for reading map, loading map
                    var map = {}
                    try{var img = getImageData(await loadImage("/chunk_data/maps/"+(playerState.current_chunk.x+x)+"/"+(playerState.current_chunk.y+y)+".png"));}catch{var img=false;}

                    //initializing map key
                    for(let key of data[0].slice(1).split(';')){
                        key=key.split(':');map[key[0]]=key[1];
                    }
                    
                    //loading tile list with corresponding images
                    var cur_pixel = "";var on_pixpart = 0;
                    for(let i=0;i<img.length;i++){
                        if(on_pixpart!=3){cur_pixel+=img[i]+',';}
                        on_pixpart++;
                        if(on_pixpart==4){
                            on_pixpart=0;

                            
                            if((i-3)%128==0){tiles.push([]);}
                            tiles[Math.floor(i/128)].push(map[cur_pixel.slice(0,cur_pixel.length-1)])

                            cur_pixel=[];
                        }
                    }

                    return(tiles);
                })()
                :false;
                //builds entity list for given chunk
                current_chunk_entities[1-y][x+1] = data[0][0]=='{'?(() => {
                    var map = {}
                    for(let key of data[1].slice(1).split(';')){key=key.split(':');map[key[0]]=key[1];}
                    return map;
                })()
                :false;
            });
        }
    }
    //for(let i=0;i<3;i++){str="";for(j=0;j<3;j++){str+=current_chunk_tiles[i][j]==false?0:1;}Log(str);}
}

function getImageData(img){
    hctx.drawImage(img, 0, 0);
    return hctx.getImageData(0, 0, img.width, img.height).data;
}

function drawChunks() {

    //looping over chunks
    for(let cy=-1;cy<=1;cy++){for(let cx=-1;cx<=1;cx++){

        //loading tile content
        tiles = current_chunk_tiles[1-cy][cx+1];

        //drawing tiles in order
        if(tiles!=false){
            for(let x=0;x<32;x++){for(let y=0;y<32;y++){
                ctx.drawImage(

                    spriteBank.get(tiles[y][x]),
                    
                    (c.width/2)+playerState.position.x+(x*128)+(cx*chunk_size)+(playerState.current_chunk.x*chunk_size)-chunk_size, 
                    (c.height/2)+playerState.position.y+(y*128)+(cy*chunk_size)+(playerState.current_chunk.y*chunk_size)-chunk_size);
            }}
        }
    }}
}

async function main() {
    tick++;
    if(!prod){LogC();}
    var max=c.width>=c.height?c.width:c.height;ctx.clearRect(-max*100, -max*100, max*200, max*200) //clears rectangle containing all possible rotated contexts.

    drawChunks();
    await updatePlayer();

    Log("Player position: "+playerState.position.x+" "+playerState.position.y);
}

c.style.width = (prod?window.innerWidth:960)+"px"
c.style.height = (prod?window.innerHeight:540)+"px";
if(prod){mainBody.removeChild(document.getElementById("error-box"));}
if(prod){mainBody.removeChild(document.getElementById("log-box"));}

loadChunks();

loadImages().then(function() {
setInterval(async function() {
    try{
        await main();
    } catch(e) {
        ELog(`Uncaught JavaScript exception: ${e}`);
    }
}, 30);});