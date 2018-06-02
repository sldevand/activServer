module.exports = function HTTPRequest(http,host){

	var httpRequest={
		host : host,
   		http : http,
   		querystring : require('querystring'),

   		postData : function(p_path,p_data){

			var postData=httpRequest.querystring.stringify(p_data);

			var options = {
		 		host: httpRequest.host,
				method : 'POST',
		 	 	path: p_path,
		 		headers: {
		    			'Content-Type': 'application/x-www-form-urlencoded',
		    			'Content-Length': Buffer.byteLength(postData)
		  		}

			};

			const req = httpRequest.http.request(options, (res)=>{
		                        res.setEncoding('utf8');
		                        var rawData = '';
		                        res.on('data', (chunk) => {
		                                rawData += chunk;
		                        });
			});

			req.write(postData);
			req.end();
 		}, 

		getData : function(p_path,callback){

			var options = {
		 		host: httpRequest.host,
		 	 	path: p_path
			};

			
			httpRequest.http.request(options, callback).end();
		}

	}

	return httpRequest;
}

