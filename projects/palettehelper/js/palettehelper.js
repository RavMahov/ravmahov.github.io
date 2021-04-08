/*
 * Copyright (c) 2014 RavMahov
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

var desiredFrameRate = 60;
var frameTime = 1000/desiredFrameRate;
var IMG_SCENERY = new Image();
var cv;
var ctx;
var screenW = 640;
var screenH = 480;
var screenMultiplier = 1;
var tick= 0;
var devout;
var running= false;
var pal;
var tileset;
var drawPalette= true;
var currentImgURL= "gfx/tiles/TILES01.bmp";
var dragFileInputs = [];
var dragFileInputsHidden = true;
var lastLoadedFile = []; // TODO: remember to delete it

var dragNDropHintsProvider = {
    hints: ["Sprite", "Tileset", "Background"],
    currentPosition: 0
};

var pk2assetsRoot = "";

function addRootToUrl(url) {
    return pk2assetsRoot + url;
}

function init(){
    console.log("Initializing viewport...");
    cv= document.getElementById("maincv");
    ctx= cv.getContext("2d");
    cv.width = screenW*screenMultiplier;
    cv.height = screenH*screenMultiplier;
    devout= document.getElementById("devout");
    //TODO: set canvas attributes accordingly
    console.log("Loading images...");
    //not really
    console.log("Starting...");
    devout.value+="\nStarting...\n";
    getDragFileInputs();
    updateDragNDropHint();
    if (window.File && window.FileList && window.FileReader) {
        initDragFileInputs();
        showDragFileInputs();
    }
    loadPK2Palette("gfx/scenery/FIELD4_N.bmp", function(){loadPK2Image("gfx/tiles/TILES01.bmp", tileset)});
    //gameloop is executed elsewhere (after image load)
    //gameloop();

}

function updateDragNDropHint(){
    dragNDropHintsProvider.currentPosition = (dragNDropHintsProvider.currentPosition+1)%dragNDropHintsProvider.hints.length;
    document.getElementById("dragNDropHintContainer").innerText = dragNDropHintsProvider.hints[dragNDropHintsProvider.currentPosition];
    setTimeout(updateDragNDropHint, 1000);
}

function gameloop(){
    var startStamp = new Date().getTime(); //Get the time at the start to get total cycle time later
    if(tick%4==0){  //update palette
        pal.paletteCycle();
        //experiments with water tile effect
        //pal.paletteCycle(192,207);//nope
        //pal.paletteCycle(32,47); //neither that
        //tileset.rebuild(); //rebuilds the whole image instead of just palette-shifted pixels
        tileset.rebuildPaletteCycledPixels();
    }
    render();
    tick++;
    setTimeout(gameloop, frameTime-(new Date().getTime()-startStamp));
};
function render(){
    ctx.drawImage(IMG_SCENERY, 0, 0, 640, 480, 0, 0, 640, 480);
    /*for(var i=0; i<20; i++){
     ctx.drawImage(tileset.cv, (i%10)*32, 0, 32, 32, i*32, i*32, 32, 32);
     }*/
    ctx.drawImage(tileset.cv, 0, 0, tileset.width, tileset.height, 0, 0, tileset.width, tileset.height);
    //draw palette
    if(drawPalette){
        var mplier= 4;
        for(var i= 0; i< 256; i++){
            //console.log("rgb("+pal.colors[i][2]+", "+pal.colors[i][1]+", "+pal.colors[i][0]+",255)");
            ctx.fillStyle = "rgba("+pal.colors[i][2]+", "+pal.colors[i][1]+", "+pal.colors[i][0]+",255)";
            ctx.fillRect (640-mplier*16+mplier*(i%16),mplier*Math.floor(i/16), mplier, mplier);
        }
    }
    ctx.stroke();
};

//Util
function dec2hex(dec) {return dec.toString(16);}
function hex2dec(hex) {return parseInt(hex,16);}
//Loaders
function PK2Palette(data){
    devout.value+= "Signature: "+ data.readString(2) +"\n";
    devout.value+= "File size: "+ data.readULong() +"\n";
    data.readULong(); //who needs the reserved fields AKA skip 4 bytes;
    data.readULong(); //who needs the pixel array offset AKA skip another 4 bytes;
    this.dibstart= data.offset; //
    this.dibsize= data.readULong();
    devout.value+= "DIB Header size: "+ this.dibsize +"\n"; //this will come in handy
    devout.value+= "Image Width: "+ data.readULong() +"\n";
    devout.value+= "Image Height: "+ data.readULong() +"\n";
    devout.value+= "Planes: "+ data.readUShort() +"\n";
    devout.value+= "Bits Per Pixel: "+ data.readUShort() +"\n";
    devout.value+= "Compression: "+ data.readULong() +"\n";
    devout.value+= "Image Size: "+ data.readULong() +"\n";
    devout.value+= "X Pixels Per Meter: "+ data.readULong() +"\n";
    devout.value+= "Y Pixels Per Meter: "+ data.readULong() +"\n";
    //ok, bored as hell, now the real deal
    data.seek(this.dibstart+this.dibsize);
    this.colors= [];
    var tempcolor;
    var j;
    for(var i= 0; i<256; i++){
        tempcolor= [];
        for(j= 0; j<4; j++){
            tempcolor.push(data.readUByte());
        }
        this.colors.push(tempcolor); //BGRA;
    }
}
PK2Palette.prototype.paletteCycle= function(a, b){
    if(!a) a= 224;
    if(!b) b= 239;
    var temp= this.colors[b];
    for(var i= b; i>a; i--){
        this.colors[i]= this.colors[i-1];
    }
    this.colors[a]= temp;
}
function PK2Image(data, cv){
    this.cv;
    if(!cv){
        this.cv= document.createElement('canvas'); //cv;
    } else {
        this.cv= cv;
    }
    devout.value+= "\nImage\n";
    devout.value+= "Signature: "+ data.readString(2) +"\n";
    devout.value+= "File size: "+ data.readULong() +"\n";
    data.readULong(); //who needs the reserved fields AKA skip 4 bytes;
    var pixArrOffset= data.readULong(); //the most important thing: the offset to the pixel array;
    this.dibstart= data.offset; //FIXME: do we need to actually store it?
    this.dibsize= data.readULong();
    devout.value+= "DIB Header size: "+ this.dibsize +"\n"; //this will come in handy
    this.width= data.readULong(); //read the image width
    this.cv.width= this.width;    //set the cv width
    devout.value+= "Image Width: "+ this.width +"\n";
    this.height= data.readULong();  //read the image height;
    this.cv.height = this.height;   //set the cv height;
    devout.value+= "Image Height: "+ this.height +"\n";
    this.ctx= this.cv.getContext("2d");
    this.imgdata=this.ctx.createImageData(this.width, this.height); //needed for drawing

    devout.value+= "Planes: "+ data.readUShort() +"\n";
    this.bitsPerPixel= data.readUShort();

    devout.value+= "Bits Per Pixel: "+ this.bitsPerPixel +"\n";
    if(this.bitsPerPixel !=8) devout.value+= "WARNING: Bits Per Pixel is not 8\n";
    devout.value+= "Compression: "+ data.readULong() +"\n";
    devout.value+= "Image Size: "+ data.readULong() +"\n";
    devout.value+= "X Pixels Per Meter: "+ data.readULong() +"\n";
    devout.value+= "Y Pixels Per Meter: "+ data.readULong() +"\n";
    //Go to the most important part
    data.seek(pixArrOffset);

    this.pixels= [];
    this.palCycledPixels= [];
    var j;
    for(var i= 0; i<this.height; i++){ // allocating vertical "memory", because the image is inverted
        this.pixels.push([]);
    }
    for(var i= this.height-1; i>-1; i--){
        for(j= 0; j<this.width; j++){
            this.pixels[i].push(data.readUByte());
            if(this.pixels[i][j]<= 239 && this.pixels[i][j] >= 224){
                this.palCycledPixels.push([i,j]);
            }
        }
    }
    this.rebuild();
}

PK2Image.prototype.rebuild= function(variant){
    var tempindex;
    var tempcolor;
    for(var i= 0; i<this.height; i++){
        for(var j= 0; j<this.width; j++){
            tempindex= this.pixels[i][j];
            if(tempindex> 239){
                this.imgdata.data[(j+this.width*i)*4]=0
                this.imgdata.data[(j+this.width*i)*4+1]=0
                this.imgdata.data[(j+this.width*i)*4+2]=0
                this.imgdata.data[(j+this.width*i)*4+3]=0
            } else {
                if(variant !== undefined && variant < 255 && tempindex < 224){
                    tempindex = (tempindex%32)+variant;
                }
                tempcolor= pal.colors[tempindex];
                this.imgdata.data[(j+this.width*i)*4]=tempcolor[2];
                this.imgdata.data[(j+this.width*i)*4+1]=tempcolor[1];
                this.imgdata.data[(j+this.width*i)*4+2]=tempcolor[0];
                this.imgdata.data[(j+this.width*i)*4+3]=255;
            }
        }
    }
    this.ctx.putImageData(this.imgdata, 0, 0);
}
PK2Image.prototype.rebuildPaletteCycledPixels= function(){
    var tempcoords;
    var tempcolor;
    for(var i= 0; i< this.palCycledPixels.length; i++){
        tempcoords= this.palCycledPixels[i];
        tempcolor= pal.colors[this.pixels[tempcoords[0]][tempcoords[1]]];
        this.imgdata.data[(tempcoords[1]+this.width*tempcoords[0])*4]=tempcolor[2];
        this.imgdata.data[(tempcoords[1]+this.width*tempcoords[0])*4+1]=tempcolor[1];
        this.imgdata.data[(tempcoords[1]+this.width*tempcoords[0])*4+2]=tempcolor[0];
        this.imgdata.data[(tempcoords[1]+this.width*tempcoords[0])*4+3]=255;
    }
    this.ctx.putImageData(this.imgdata, 0, 0);
}
function loadPK2Palette(url, callback){
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if(request.readyState == 4 && request.status == 200) {
            console.log("Loaded");
            pal = new PK2Palette(new BinaryFile(request.responseText));
            IMG_SCENERY.src= addRootToUrl(url);//TODO: remember to delete it
            if(callback) callback();
        } else if(request.status == 404){
            console.log("Couldn't find file (404)");
        }
    }
    request.open('GET', addRootToUrl(url), true);
    request.overrideMimeType('text/plain; charset=x-user-defined');
    request.setRequestHeader('Content-Type', 'text/plain');
    request.send(null);
}
function loadPK2Image(url, pk2img){
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if(request.readyState == 4 && request.status == 200) {
            tileset = new PK2Image(new BinaryFile(request.responseText));
            console.log("Loaded");
            if(!running){
                running= true;
                gameloop();
            }
        } else if(request.status == 404) {
            console.log("Couldn't find file (404)");
        }
    }
    request.open('GET', addRootToUrl(url), true);
    request.overrideMimeType('text/plain; charset=x-user-defined');
    request.setRequestHeader('Content-Type', 'text/plain');
    request.send(null);
}

function showDragFileInputs(){
    for(var i in dragFileInputs){
        dragFileInputs[i].classList.remove("hiddenComponent");
    }
    dragFileInputsHidden = false;
}

function hideDragFileInputs(){
    for(var i in dragFileInputs){
        dragFileInputs[i].classList.add("hiddenComponent");
    }
    dragFileInputsHidden = true;
}

function toggleDragFileInputs(){
    if(dragFileInputsHidden){
        showDragFileInputs();
    } else {
        hideDragFileInputs();
    }
}

function getDragFileInputs(){
    var dragFileInputDivs = ["spriteDragFileInput","backgroundDragFileInput"];
    for(var i in dragFileInputDivs){
        dragFileInputs.push(document.getElementById(dragFileInputDivs[i]));
    }
}

function initDragFileInputs(){
    for(var i in dragFileInputs){
        dragFileInputs[i].addEventListener("dragover", fileDragHover, false);
        dragFileInputs[i].addEventListener("dragleave", fileDragHover, false);
    }
    dragFileInputs[0].addEventListener("drop", spriteFileDropHandler, false);
    dragFileInputs[1].addEventListener("drop", backgroundFileDropHandler, false);
}

function fileDragHover(e) {
    e.stopPropagation();
    e.preventDefault();
    if(e.type == "dragover"){
        e.target.classList.add("hover");
    } else {
        e.target.classList.remove("hover");
    }
}

function handleDragDropAndReturnFileList(e){
    fileDragHover(e);
    //e.stopPropagation();
    e.preventDefault();
    var files = e.target.files || e.dataTransfer.files;
    return files;
}

function spriteFileDropHandler(e){
    var files = handleDragDropAndReturnFileList(e);
    for (i in files){
        parseSprite(files[i]);
    }
}

function backgroundFileDropHandler(e){
    var files = handleDragDropAndReturnFileList(e);
    for (i in files){
        parseBackground(files[i]);
    }
}

function parseSprite(f){
    if(f.type == "image/bmp" || f.type == "image/x-bmp"){
        var reader = new FileReader();
        reader.onload = function(e){
            tileset = new PK2Image(new BinaryFile(e.target.result));
            if(!running){
                running= true;
                gameloop();
            }
        }
        reader.readAsText(f, "x-user-defined");
    } else {
        console.log("Wrong file type: "+f.type);
    }
}

function parseBackground(f){
    if(f.type == "image/bmp" || f.type == "image/x-bmp"){
        var reader = new FileReader();
        IMG_SCENERY.src= window.URL.createObjectURL(f);//TODO: remember to delete it
        reader.onload = function(e){
            pal = new PK2Palette(new BinaryFile(e.target.result));
            if(tileset!==undefined) {
                tileset.rebuild();
            }
        }
        reader.readAsText(f, "x-user-defined");
    } else {
        console.log("Wrong file type: "+f.type);
    }
}

function toggleDevOut(){
    if(devout.classList.contains("hiddenComponent")){
        devout.classList.remove("hiddenComponent");
    } else {
        devout.classList.add("hiddenComponent");
    }
}

function setColorVariant(color){
    var color = document.getElementById("color-variant-selector").value;
    var variant = parseInt(color);
    tileset.rebuild(variant);
}

function saveRecoloredSprite(btn){
    var dataString = tileset.cv.toDataURL("image/png");
//    window.open(dataString);
    btn.href = dataString;
    btn.download = "PK2Image.png";
}