import { environment } from './../../../environments/environment';
import { convertFlux, Functions } from '@app/helper/functions';
import { DocsService } from '@app/services/docs.service';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { ApiService, FLUX_VERSION, QUERY_LIST } from 'src/app/services/api.service';
import { emitWindowResize, getStorage, saveToFile, setLink, setStorage } from '@app/helper/windowFunctions';
import { Row } from '@app/models/grid.model';
import { Dictionary } from '@app/components/ace-editor-ext/dictionary-default';
import { promiseWait } from '@app/helper/functions';
import { MatDialog } from '@angular/material/dialog';
import { DialogKioskComponent } from '../dialogs/dialog-kiosk/dialog-kiosk.component';
import { getParam, HashParams } from '@app/services/get-params.service';


@Component({
    templateUrl: './home.page.component.html',
    styleUrls: ['./home.page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent implements OnInit {
    getParam: HashParams = getParam;
    isAccess = true;
    isReadonly = true;
    isDarkMode = false;
    isDocsShows = false;
    dbItems: any[] = [];
    isLeftPanel = true;
    dbLink: string = '';
    dbLogin: string = '';
    dbPassword: string = '';
    isFlux: boolean = !!environment.isFlux;

    sqlRequest: any = '';
    _selectedDB: any;
    readyToWork = false;

    set selectedDB(val: any) {
        if (this.dbLink === val?.value?.dbLink &&
            this.dbLogin === val?.value?.dbLogin &&
            this.dbPassword === val?.value?.dbPassword
        ) {
            this._selectedDB = val;
            return;
        }

        if (this._selectedDB?.value && this._selectedDB.value?.dbLink !== val?.value?.dbLink) {
            this._selectedDB = val;
            this.connectToDB(this._selectedDB.value);
            this.cdr.detectChanges();
        } else if (!this._selectedDB) {
            // start app
            this._selectedDB = val;
            this.cdr.detectChanges();
        }
    }
    get selectedDB() {
        return this._selectedDB;
    }

    dictionary: Dictionary[] = [];

    dataForFile: any = null;
    isLoadingDetails = false;
    details: any = [];
    columns: any[] = [];
    errorMessage: string = '';
    authErrorMessage: string = '';
    authSuccessMessage: string = '';
    PopularQueries: string[] = [
        'SHOW DATABASES',
        'SHOW TABLES',
    ];
    FluxPopularQueries: any = [
        {
            key: 'Version',
            value: `import "array"
import "runtime"
array.from(rows: [{version: runtime.version()}])`,
        }, {
            key: 'Generate',
            value: `import g "generate"
g.from(start: 2022-04-01T00:00:00Z, stop: 2022-04-01T00:03:00Z, count: 5, fn: (n) => n+1)`,
        }, {
            key: 'Sample Data', value:
                `import "sampledata"

sampledata.int()
    |> group(columns: ["_time", "tag"])`,
        },
        {
            key: 'BTC', value: `import "array"
import "experimental/json"
import "experimental/http/requests"
import "strings"
import "regexp"
import "experimental/array"
import "types"

api_key = "8e90abe4-b320-4af7-8591-08d29a6e5f1c"
url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?CMC_PRO_API_KEY=` + '${api_key}' + `&limit=10"

response = requests.get(url:url)
json_s = string(v: response.body)

s1 = regexp.replaceAllString(r: /"platform":(null,|\\{[^\\}]+\\},)/, v: json_s, t:"")
s2 = strings.replaceAll(v: s1, t: "\\"self_reported_circulating_supply\\":null,", u: "",)
s3 = strings.replaceAll(v: s2, t: "\\"self_reported_market_cap\\":null,", u: "")
s4 = strings.replaceAll(v: s3, t: "\\"max_supply\\":null,", u: "\\"max_supply\\": 0,")
s5 = strings.replaceAll(v: s4, t: "\\"error_message\\":null,", u: "")
s6 = strings.replaceAll(v: s5, t: "\\"notice\\":null,", u: "")
data = json.parse(data: bytes(v: s6))
array.from(rows: data.data |>
    array.map(
    fn: (x) => ({
        price:x.quote.USD.price,
        name: x.name,
        symbol: x.symbol,
        // _time: time(v: x.last_updated),
        has_payment: length(arr: x.tags |> array.filter(fn: (x) => x == "payments"))
    })
))`,
        },
        {
            key: 'Fetch CSV', value: `import "csv"
import "experimental"
import "experimental/http/requests"

response = requests.get(
    url: "https://github.com/aws-samples/aws-fraud-detector-samples/blob/master/data/registration_data_20K_minimum.csv?raw=true",
    body: bytes(v: "example-request-body")
)

csv.from(csv: string(v: response.body), mode: "raw")`,
        }, {
            key: 'HTTP',
            value: `import "experimental/http/requests"

response = requests.post(url: "http://example.com")
requests.peek(response: response)`,
        }, {
            key: 'HTTP JSON',
            value: `import "experimental/http/requests"
import ejson "experimental/json"
import "json"
import "array"

response =
        requests.post(
            url: "https://goolnk.com/api/v1/shorten",
            body: json.encode(v: {url: "http://www.influxdata.com"}),
            headers: ["Content-Type": "application/json"],
        )

data = ejson.parse(data: response.body)
array.from(rows: [data])`,
        }, {
            key: 'Prom Scrape', value: `import "experimental/prometheus"

prometheus.scrape(url: "https://mon.jaytaala.com/metrics")`
        }];
    _SqlArchive: any = [];
    isAuthenticated = false;

    set SqlArchive(value: any) {
        this._SqlArchive[this.checkSqlHistory()] = value;

    }
    get SqlArchive(): any[] {
        return this._SqlArchive[this.checkSqlHistory()];
    }

    checkSqlHistory() {
        const key = this.keyOfSqlHistory();
        if (!this._SqlArchive[key]) {
            this._SqlArchive[key] = [];
            const json = localStorage.getItem(key);
            if (json) {
                this._SqlArchive[key] = JSON.parse(json);
            }
        }
        return key;
    }
    dbTreeData: any[] = [];
    pageSize: number = 50;
    isPaginator: boolean = true;
    currentRow: Row = new Map();
    parseFloat = parseFloat;
    constructor(
        private apiService: ApiService,
        private docsService: DocsService,
        private cdr: ChangeDetectorRef,
        public dialog: MatDialog
    ) {
        if (getParam.kiosk) {
            this.isDarkMode = getParam.mode === 'dark';
        }
        if (getParam.query) {
            // `template:${templ.key}`
            if ((getParam.query + '').match(/^template\:/g)) {
                const value = this.FluxPopularQueries.find((i: any) => i.key === getParam?.query?.split(':')?.[1])?.value;
                this.sqlRequest = value;
                console.log(getParam.query.split(':'), this.sqlRequest)
            } else {

                this.sqlRequest = getParam.query;
            }
        }
    }

    checkDBList() {
        const dbItems = getStorage('dbItems') || [];
        const AUTH_DATA: any = getStorage('AUTH_DATA');
        if (!dbItems || !AUTH_DATA) {
            return;
        }
        if (!dbItems.find((dbItem: any) => dbItem?.value?.dbLink === AUTH_DATA?.dbURL)) {
            const rx = /[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+/;
            const temp = {
                value: {
                    dbLink: AUTH_DATA.dbURL,
                    dbLogin: AUTH_DATA.login,
                    dbPassword: AUTH_DATA.password,
                    isFlux: !!environment.isFlux,
                    isSucceeded: true
                },
                viewValue: (AUTH_DATA.dbURL + '').match(rx)?.[0],
            };

            dbItems.push(temp);
            setStorage('dbItems', dbItems);
        }

    }

    @HostListener('document:mousemove', ['$event'])
    emitWindowResize() {
        emitWindowResize();
    }



    ngOnInit(): void {


        const auth: any = (getParam.db_host ? {
            dbURL: getParam.db_host,
            login: getParam.db_login,
            password: getParam.db_pass,
            isFlux: environment.isFlux
        } : getStorage('AUTH_DATA')) || {
            dbURL: location.origin,
            login: 'default',
            password: '',
            isFlux: environment.isFlux
        };
        // console.log("auth", !!auth?.dbURL)

        if (auth?.dbURL) {
            this.dbLink = auth.dbURL;
            this.dbLogin = auth.login;
            this.dbPassword = auth.password;
            this.isFlux = environment.isFlux;
        } else {
            this.isAccess = false;
        }
        if (!!auth?.dbURL) {
            this.connectToDB().then(async () => {
                this.readyToWork = true;
                await this.getDynamicDictionary();
                this.cdr.detectChanges();
            });
        }
        // console.log(this.currentRow.size)
        this.docsService.listen().subscribe(doc_link => {
            this.isDocsShows = false;
            this.cdr.detectChanges();
            requestAnimationFrame(() => {
                this.isDocsShows = !!doc_link;
                this.cdr.detectChanges();
            })
            // this.isLeftPanel = !doc_link;
        });


    }
    async getDynamicDictionary() {
        if (environment.isFlux) {
            return;
        }
        if (getParam.kiosk && !getParam.query_field) {
            return await promiseWait(0);
        }
        const queryList: string[] = [
            'SELECT name FROM system.functions',
            'SELECT name FROM system.formats'
        ];

        const stack = async (query: any) => {
            const { data } = await this.apiService.runQuery(query) || {};
            const bool = query.includes('system.functions');
            const r: Dictionary[] = data?.map((value: any) => ({
                name: value[0] + '()',
                icon: bool ? 1 : 2,
                type: bool ? 'function' : 'format'
            })) || [];

            this.dictionary.push(...r);
            if (queryList.length > 0) {
                await promiseWait(20);
                stack(queryList.shift())
            } else {
                // END OF LOOP
                this.cdr.detectChanges();
            }
        };

        stack(queryList.shift())
    }
    async initDbTree() {
        if (environment.isFlux) {
            return await promiseWait(0);
        }
        if (getParam.kiosk && !getParam.panel) {

            return await promiseWait(0);
        }
        const result: any = await this.apiService.runQuery(QUERY_LIST.getDatabases);

        let { data } = result || {};

        if (!data && typeof result === 'string') {
            data = result.split('\n').map(i => ([i]));
        }
        // console.log({ data });
        const dbTreeData: any[] = [];
        const stack = async ([dbName]: any) => {
            await promiseWait(5);
            let lvf;
            try {
                lvf = await this.apiService.runQuery(QUERY_LIST.useDatabase(dbName));
            } catch (err) {
                dbTreeData.push({
                    name: dbName,
                })
            }
            if (lvf === null) {
                const tablesList: any = await this.apiService.runQuery(QUERY_LIST.getTables);
                dbTreeData.push({
                    name: dbName,
                    type: 'database',
                    children: tablesList?.data?.map((t: any) => {
                        const [tableName] = t;
                        const tableId = `${dbName}."${tableName}"`;
                        this.dictionary.push({
                            name: tableId,
                            icon: 3,
                            type: 'table',
                        });
                        let type = 'table';
                        if (tableId.match(/\.\./g)) {
                            type = 'non-table';
                        }
                        return {
                            name: tableName,
                            description: tableId,
                            type
                        }
                    })
                });
            }
            if (data?.length > 0) {
                stack(data.shift())
            } else {
                this.dbTreeData = dbTreeData;
                this.cdr.detectChanges();
            }
        };
        if (data?.length > 0) {
            stack(data.shift())
        } else {
            this.dbTreeData = [{
                name: '...no data',
                // type: 'database'
            }]
        }
    }

    onDbChoose(event?: any): void {
        const LIMIT = 50;
        const sqlStr = `SELECT * FROM ${event.description} LIMIT ${LIMIT}`;
        if (event?.level === 1) {
            this.SQL(sqlStr)
        }
    }

    isObjectData() {
        return typeof this.details === 'object';
    }

    formatData(data: any) {
        data = data || { meta: [], data: [] };
        console.log('0', { data });
        try {
            if (environment.isFlux) {
                data = convertFlux(data)
            }
        } catch (err) { }
        console.log('1', { data });
        if (typeof data !== 'object') {
            this.details = data;
        } else {
            this.columns = data.meta?.map((i: any) => i.name);
            this.details = data.data?.map((i: any) => {
                const itemArray: any[] = i instanceof Array ? i : Object.values(i);
                let out: any = {};
                itemArray.forEach((j: any, k: any) => {
                    out[this.columns[k]] = j;
                });
                return out;
            });
        }
    }

    getHash() {
        if (!location.hash) {
            return false;
        }
        try {
            const sqlRequest = getParam.query;
            if ((getParam.query + '').match(/^template\:/g)) {
                const value = this.FluxPopularQueries.find((i: any) => i.key === getParam?.query?.split(':')?.[1])?.value;
                this.sqlRequest = value;
                console.log(getParam?.query?.split(':'), this.sqlRequest)
            } else {

                this.sqlRequest = getParam.query;
            }
            // this.sqlRequest = sqlRequest;
            this.SQL(this.sqlRequest);
            this.isAccess = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    setHash() {
        const templ = this.FluxPopularQueries.find( (i: any) => i.value === this.sqlRequest)
        console.log({ templ, from: Object.entries(this.FluxPopularQueries) });
        const q = templ?.key ? `template:${templ.key}` :this.sqlRequest
        location.hash = setLink(q, {
            dbLink: this.dbLink,
            dbLogin: this.dbLogin,
            dbPassword: this.dbPassword,
            isFlux: environment.isFlux,
        });

    }

    keyOfSqlHistory() {
        return 'SqlArchive-' + Functions.md5(this.dbLink);
    }

    async SQL(sqlStr: string, isAuthenticated: boolean = false) {
        if (!sqlStr) {
            this.isLoadingDetails = false;
            return false;
        }
        if (!isAuthenticated) {
            this.sqlRequest = sqlStr;
        }
        this.isLoadingDetails = true;

        this.cdr.detectChanges();

        this.details = [];

        if (!isAuthenticated) {
            this.setHash();
        }

        if (!this.SqlArchive.includes(sqlStr)) {
            this.SqlArchive.unshift(sqlStr);
            localStorage.setItem(this.keyOfSqlHistory(), JSON.stringify(this.SqlArchive));
        }

        try {
            const response = await this.apiService.runQuery(sqlStr);
            if (!isAuthenticated) {
                this.formatData(response);
                if (environment.isFlux) {
                    this.dataForFile = convertFlux(response);
                    this.dataForFile.statistics.bytes_read = this.dataForFile.statistics.bytes_read || new Blob([response]).size;
                } else {
                    this.dataForFile = response;
                }
                console.log({ dataForFile: this.dataForFile });
            }
            this.errorMessage = '';
            this.isLoadingDetails = false;
            this.cdr.detectChanges();
            return true;

        } catch (error: any) {
            console.error(error, isAuthenticated);
            this.details = [];
            if (!isAuthenticated) {
                this.errorMessage = error.error || error.message;
            } else {
                this.authErrorMessage = error.error || error.message;
                this.isAccess = false;
                console.error({ authErrorMessage: this.authErrorMessage });
                requestAnimationFrame(() => {
                    this.cdr.detectChanges();
                })
            }

            this.isLoadingDetails = false;
            this.cdr.detectChanges();

            return false;
        }
    }

    onClickRun(event?: any): void {
        this.sqlRequest = event;
        this.SQL(this.sqlRequest);
    }
    async connectToDB(event?: any, isTestConnection = false) {
        this.isLoadingDetails = true;
        if (event) {
            this.dbLink = event.dbLink;
            this.dbLogin = event.dbLogin;
            this.dbPassword = event.dbPassword;
            this.isFlux = !!environment.isFlux;
        }
        const auth = {
            dbURL: this.dbLink,
            login: this.dbLogin,
            password: this.dbPassword,
            isFlux: environment.isFlux,
        };
        this.apiService.setLoginData(auth);
        let res;
        try {
            await this.apiService.runQuery(environment.isFlux ? FLUX_VERSION : QUERY_LIST.getDatabases)
            res = true;
        } catch (e) {
            res = false;
        }
        if (res) {
            this.authErrorMessage = '';
            this.errorMessage = '';
            this.authSuccessMessage = '';
            if (!isTestConnection) {
                setStorage('AUTH_DATA', auth);
                this.checkDBList();
                this.isAccess = true;
                this.getHash();

                await promiseWait(100);
                await this.initDbTree();

                this.cdr.detectChanges();
                this.isLoadingDetails = false;
            } else {
                this.authSuccessMessage = 'Connection is successfully established.';
                setTimeout(() => {
                    this.authSuccessMessage = '';
                    this.cdr.detectChanges();
                }, 5000);
            }
            this.cdr.detectChanges();
            return true;
        } else {
            this.isLoadingDetails = false;
            this.authErrorMessage = 'Can not connect to DB server, check login / password / link to DB, please';
            this.cdr.detectChanges();
        }
        this.errorMessage = '';
        return false;
    }
    openRow(event: Map<string, any>) {
        this.currentRow = event;
    }
    setReadonly(bool: boolean) {
        this.isReadonly = bool;
        this.apiService.setReadOnly(bool);
    }
    save(buttonName: string) {
        let type: string = '';
        let format: string = '';
        let isCompact: boolean = false;
        const FORMAT = 'FORMAT';
        const fname = 'tableData.';
        switch (buttonName) {
            case 'Save as JSON':
                type = 'JSON';
                format = type;
                break;
            case 'Save as JSONCompact':
                type = 'JSON';
                format = type;
                isCompact = true;
                break;
            case 'Save as CSV':
                type = 'CSVWithNames';
                format = 'csv'
                break;
            default: return;
        }

        let [sqlStr] = this.sqlRequest.split(FORMAT);

        sqlStr += ` ${FORMAT} ` + (isCompact ? 'JSONCompact' : type);

        this.apiService.runQuery(sqlStr).then(result => {
            if (type === 'csv') {
                saveToFile(result, fname + format);
            } else {
                saveToFile(JSON.stringify(result, null, 2), fname + format);
            }
        })
    }
    bytesToSize(bytes: any): string | null {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) {
            return bytes + ' Bytes';
        }
        const i = Math.floor(+Math.log(bytes) / +Math.log(1024))
        if (i === 0) {
            return `${bytes} ${sizes[i]}`;
        }
        return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`
    }
    timeShorter(sec: number): string {
        const ms = Math.round((sec) * 1000);
        const _ = (n: number) => (n + '').length === 1 ? '0' + n : n;
        const o = {
            'hours': _(Math.floor(ms / (1000 * 60 * 60))),
            'min': _(Math.floor(ms / (1000 * 60) % 60)),
            'sec': _(Math.floor((ms / 1000) % 60)),
            'ms': ((ms % 1000) / 1000) ? ((ms % 1000) / 1000).toString().replace('0.', '') : '000'
        };
        if (ms < 1000) { // ms
            return `${ms} ms`;
        } else if (ms < 1000 * 60) { // sec
            return `${o.sec}.${o.ms} sec`;
        } else if (ms < 1000 * 60 * 60) { // min
            return `${o.min}:${o.sec}.${o.ms} min`;
        } else { // hours
            return `${o.hours}:${o.min}:${o.sec}.${o.ms} hour(s)`;
        }
    }

    getStatistic(dataForFile: any): string {
        const stat = dataForFile?.statistics;
        const rows = dataForFile?.rows || 0;
        const elapsed = this.timeShorter(stat?.elapsed || 0);
        const rows_read = stat?.rows_read || rows;
        const bytes_read = this.bytesToSize(stat?.bytes_read || 0)
        const rowsPerSec = Math.ceil((rows > 0 ? rows / (stat?.elapsed || 1) : 0));

        const bytesPerSec = this.bytesToSize(
            (stat?.bytes_read || 0) /
            (parseFloat(stat?.elapsed || 0) || 0.001)
        );

        return [
            `${rows} rows in set. Elapsed ${elapsed}`,
            rows_read && ` Processed ${rows_read} rows`,
            `${bytes_read} (${rowsPerSec} rows/s. ${bytesPerSec}/s.)`
        ].filter(i => !!i).join(', ');
    }
    setDBItems(DBItems: any = null) {
        if (DBItems) {
            this.dbItems = DBItems;
        }
        this.selectedDB = DBItems.find((item: any) => {
            return item.value.dbLink === this.dbLink
        })
        requestAnimationFrame(() => {
            this.cdr.detectChanges();
        })
    }
    openDialog(): void {
        const dialogRef = this.dialog.open(DialogKioskComponent, {
            width: '650px',
            data: {
                dbLink: this.dbLink,
                dbLogin: this.dbLogin,
                dbPassword: this.dbPassword,
                sqlRequest: this.sqlRequest,
                isFlux: environment.isFlux
            },
        });

        dialogRef.afterClosed().subscribe((result: any) => {
            requestAnimationFrame(() => {
                this.cdr.detectChanges();
            });
        });
    }
    removeItemHistory(item: any): void {
        this.SqlArchive = this.SqlArchive.filter(i => i !== item);
        localStorage.setItem(this.keyOfSqlHistory(), JSON.stringify(this.SqlArchive));
    }
}
