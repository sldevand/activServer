var fetch = require('node-fetch');
module.exports = function ApiFetchRequest(p_basePath) {
    let basePath = p_basePath;

    return {
        send: (method, endpoint, data, id) => {
            let url = basePath + "/" + endpoint;
            if (id !== undefined) {
                url += '/' + id;
            }
            return fetch(url,
                {
                    method: method,
                    body: JSON.stringify(
                        data
                    )
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
