var fetch = require('node-fetch');
module.exports = function ApiFetchRequest(p_basePath) {
    let basePath = p_basePath;

    return {
        send: (method, endpoint, data, stringifyBody = true, id = undefined) => {
            let url = basePath + "/" + endpoint;
            if (id !== undefined) {
                url += '/' + id;
            }
            if (stringifyBody) {
                data = JSON.stringify(
                    data
                );
            }

            return fetch(url,
                {
                    method: method,
                    body: data
                })
                .then((response) => {
                    return response.json();
                })
                .catch(err => {
                    console.error(err)
                })
        },
        get: (endpoint, id) => {
            let url = basePath + "/" + endpoint;
            if (id !== undefined) {
                url += '/' + id;
            }
            return fetch(url)
                .then((response) => {
                    return response.json();
                })
                .catch(err => {
                    console.error(err)
                });
        }
    }
};
