activServer
======
**activServer** is the nodeJS server in home automation system ActivHome. 
It manages connections between Arduino and websockets with [serialport](https://www.npmjs.com/package/serialport) and socket.io.

## Prerequisites
You must make, program and plug an Arduino in your RaspberryPi before starting this server.

## Dependencies
[Forever](https://www.npmjs.com/package/forever) : A simple CLI tool for ensuring that a given script runs continuously (i.e. forever).
```
npm install forever -g
```

## Install
```
npm install
```

## Configure
You can configure your server inside activServerLaucher file

FOREVER="/usr/local/bin/forever" <-- Where forever is installed<br>
BPATH="/home/pi/activServer/" <-- Your base Path<br>

## Serve

```
sudo chmod +x activServerLauncher
./activServerLauncher
```


## License 
* see [LICENSE](https://github.com/sldevand/activServer/blob/master/LICENSE.md) file

