const prod = true;

const mainBody = document.getElementById('main-body');
const c = document.getElementById('canvas');
const ctx = c.getContext("2d");

var spriteBank = new Map();

var tick = 0;

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
    position: {x:0,y:0}
}

document.addEventListener('keydown', (event) => {
    if(event.key == 'w'){inputState.up=true;}
    if(event.key == 's'){inputState.down=true;}
    if(event.key == 'a'){inputState.left=true;}
    if(event.key == 'd'){inputState.right=true;}

    if(event.key == 'e'){inputState.turnright=true;}
    if(event.key == 'q'){inputState.turnleft=true;}

    if(event.key == ' '){inputState.space=true;}
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

function updatePlayer() {
    //movement
    if(inputState.up){playerState.position.y+=1;playerState.direction=2}
    if(inputState.down){playerState.position.y-=1;playerState.direction=0}
    if(inputState.left){playerState.position.x+=1;playerState.direction=3}
    if(inputState.right){playerState.position.x-=1;playerState.direction=1}
    
    //walking frames
    if(inputState.left||inputState.right){
        if(tick%7===0){playerState.walking_frame=playerState.walking_frame===3?0:playerState.walking_frame+1;}
    }else if(inputState.up||inputState.down) {
        if(tick%7===0){playerState.walking_frame=playerState.walking_frame===1?3:1}
    }else{playerState.walking_frame=0;}

    //Drawing the player using the walking spritesheet
    ctx.drawImage(
        spriteBank.get("character_walksheet"), 
        32*playerState.direction, 32*(playerState.walking_frame>1?(playerState.walking_frame===2?0:2):playerState.walking_frame), 
        32, 32, //
        (c.width/2)-16, (c.height/2)-16, //position of image
        32, 32 //width and height of image
    );
}

async function main() {
    if(!prod){LogC();}
    ctx.clearRect(0, 0, c.width, c.height);

    ctx.drawImage(spriteBank.get("azure_bricks"), playerState.position.x, playerState.position.y);
    updatePlayer();
}

c.style.width = (prod?window.innerWidth:960)+"px"
c.style.height = (prod?window.innerHeight:540)+"px";
if(prod){mainBody.removeChild(document.getElementById("error-box"));}
if(prod){mainBody.removeChild(document.getElementById("log-box"));}

loadImages().then(function() {
setInterval(function() {
    try{
        main();
        tick++;
    } catch(e) {
        ELog(`Uncaught JavaScript exception: ${e}`);
    }
}, 30);});