//PROTOTYPES DE L'OBJET DATE
Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}

Number.prototype.padLeft = function(base,chr){
   var  len = (String(base || 10).length - String(this).length)+1;
   return len > 0? new Array(len).join(chr || '0')+this : this;
}

//DATE EN CHAINES DE CARACTERES
function stringifiedDate(){
  var date=new Date();
  var d = date.getDate();	
  var m = date.getMonth()+1;	
  var y = date.getFullYear().toString().substr(-2);	

  if(d<10)d="0"+d;
  if(m<10)m="0"+m;
  
  return fullDate=d+"-"+m+"-"+y;
}

//HEURE EN CHAINES DE CARACTERES
function stringifiedHour(){
  var date=new Date();
  var h = date.getHours();	
  var m = date.getMinutes();	
  var s = date.getSeconds();	

  if(h<10)h="0"+h;
  if(m<10)m="0"+m;
  if(s<10)s="0"+s;

 return h+":"+m+":"+s;	

}

// CHAINE DE CARACTERES EN HEURE
function strToDate(strHour){   

  var hourSplit = strHour.split(":");

  h=hourSplit[0];
  m=hourSplit[1];
  if(hourSplit.length>2) s=hourSplit[2];  
  else s=0;	

  var date=new Date();
  date.setHours(h);  
  date.setMinutes(m);  
  date.setSeconds(s); 
  return date;  

}



function nowDatetime(){
	var d = new Date;
    	var dformat = [	d.getFullYear(),
			(d.getMonth()+1).padLeft(),
		 	d.getDate().padLeft()
		].join('-')
		 + ' ' +
		[ 	d.getHours().padLeft(),
                    	d.getMinutes().padLeft(),
			d.getSeconds().padLeft()
                ].join(':');
		  
	return dformat;
}

function dayOfWeek(){

  var d = new Date();
  return d.getDay();
}

function nowIsBetween(strHourMin,strHourMax){



  var now = new Date();
  var d1 = strToDate(strHourMin);
  var d2 = strToDate(strHourMax);

  if(now >= d1 && now <=d2 ) return true;
  else return false;

}


exports.stringifiedHour = stringifiedHour;
exports.stringifiedDate = stringifiedDate;
exports.nowDatetime = nowDatetime;
exports.dayOfWeek = dayOfWeek;
exports.nowIsBetween = nowIsBetween;
