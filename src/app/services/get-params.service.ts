import { Injectable } from '@angular/core';
export interface HashParams {
    query?: string;
    db_host?: string;
    db_login?: string;
    db_pass?: string;
    kiosk?: boolean;
    mode?: 'dark' | 'light' | null | undefined;
    table?: boolean;
    chart?: boolean;
    panel?: boolean;
    query_field?: boolean;
    isFlux?: boolean;
}
export let getParam: HashParams = {
    db_host: "",
    db_login: "",
    db_pass: "",
    query: "",
    kiosk: false,
    mode: "light",
    panel: false,
    query_field: true,
    table: true,
    chart: true,
    isFlux: false
};

@Injectable({
    providedIn: 'root'
})
export class GetParamsService {

    constructor() {

        const params: any[] = location.hash?.replace('#', '')?.split("&")?.map((i: any) => i.split('=')) || [];
        params.forEach(([key, value]) => {
            switch (key) {
                case 'chart':
                    getParam.chart = !!(+value);
                    break;
                case 'db_host':
                    getParam.db_host = value;
                    break;
                case 'db_login':
                    getParam.db_login = value;
                    break;
                case 'db_pass':
                    getParam.db_pass = value;
                    break;
                case 'kiosk':
                    getParam.kiosk = !!(+value);
                    break;
                case 'mode':
                    getParam.mode = value;
                    break;
                case 'panel':
                    getParam.panel = !!(+value);
                    break;
                case 'query':
                    getParam.query = decodeURIComponent(value + '') || value;
                    break;
                case 'query_field':
                    getParam.query_field = !!(+value);
                    break;
                case 'table':
                    getParam.table = !!(+value);
                    break;
                case 'flux':
                    getParam.isFlux = !!(+value);
                    break;
            }
        })
    }

}
