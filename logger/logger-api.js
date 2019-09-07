class LoggerApi {

    constructor(apiFetchReq, df) {
        this.apiFetchReq = apiFetchReq;
        this.df = df;
    }

    log(data) {
        let date = new Date();
        this.apiFetchReq.send(
            'POST',
            'node/log/add',
            {
                "createdAt": Math.round(date.getTime()/1000),
                "content": data
            }
        ).then(
            (res) => {
                console.log(this.df.stringifiedHour() + ' ' + res.content);
            }
        );
    }
}

module.exports = LoggerApi;