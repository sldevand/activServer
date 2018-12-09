module.exports = function ApiRequest(http, host, basePath) {

    var HTTPRequest = require('./httpRequest');
    var ApiRequest = new HTTPRequest(http, host);

    ApiRequest.basePath = basePath;

    ApiRequest.get = function (p_path, callback) {
        ApiRequest.getData(ApiRequest.basePath + p_path, callback);

        return ApiRequest;
    }

    ApiRequest.post = function (p_path, p_data) {
        ApiRequest.postData(ApiRequest.basePath + p_path, p_data);

        return ApiRequest;
    }

    ApiRequest.getJSON = function (p_path) {
        var callback = (res) => {
            res.setEncoding('utf8');
            var rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
                ApiRequest.getJSONCallback(JSON.parse(rawData));
            });
        };
        return ApiRequest.get(p_path, callback);


    }

    return ApiRequest;
}
