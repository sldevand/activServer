activServer
======
**activServer** is the nodeJS server in home automation system ActivHome. 
It manages connections between Arduino and websockets with [serialport](https://www.npmjs.com/package/serialport) and socket.io.

## Prerequisites
You must make, program and plug an Arduino in your RaspberryPi before starting this server.

## Install
```
npm install
```

## Serve
Copy activServer.service.dist to activServer.service
```
sudo cp activServer.service.dist activServer.service
```

Edit the file to change WorkingDirectory and ExecStart, save it.

Copy activServer.service into /etc/systemd/system
```
sudo cp activServer.service /etc/systemd/system
```

Activate
```
sudo systemctl enable activServer.service
```

Start
```
sudo systemctl start activServer.service
```

Check status
```
sudo systemctl status activServer.service
```

If Check status is ok, remove activServer.service from activServer directory
```
sudo rm activServer.service
```

Stop
```
sudo systemctl stop activServer.service
```

Log the activServer.service
```
journalctl -f -u activServer.service
```

## License 
* see [LICENSE](https://github.com/sldevand/activServer/blob/master/LICENSE.md) file
