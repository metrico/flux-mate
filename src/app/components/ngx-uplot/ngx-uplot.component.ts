import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import * as _uPlot from 'uplot';
import { ChartType } from './models/chart.model';

const uPlot: any = (_uPlot as any)?.default;

@Component({
    selector: 'ngx-uplot',
    template: `<div style="margin: 0.5rem;" #chartUPlot></div>`,
    styleUrls: ['./ngx-uplot.style.scss'],
    styles: [
        `
            .u-legend.u-inline .u-value {
                width: 150px;
                text-align: left;
            }
        `,
    ],
    encapsulation: ViewEncapsulation.None,
})
export class NgxUplotComponent implements AfterViewInit {
    chartData: any;
    uPlotChart: any;
    options: _uPlot.Options = {
        class: 'my-chart',
        width: 0,
        height: 0,
        scales: {
            x: {
                time: false,
            },
        },
        focus: {
            alpha: 0.9
        },
        cursor: {
            focus: {
                prox: 3,
            },
        },
        series: [{}],
        legend: {
            show: false,
            live: false,
        },
    };
    _details: any = [
        [1, 3, 2, 4],
        [2, 3, 4, 1],
        [3, 4, 1, 2],
        [4, 1, 2, 3],
    ];
    _cursor: _uPlot.Cursor = {};
    @Input() customTooltip: boolean = false;
    @Output() showTooltip = new EventEmitter<any>();
    @Output() hideTooltip = new EventEmitter<void>();
    @Input() set cursor(val: _uPlot.Cursor) {
        this._cursor = val;
        if (this.options.cursor) {
        this.options.cursor = Object.assign(this.options.cursor, val);
        } else {
            this.options.cursor = val;
        }
        this.makeChart(this.data);
    }
    get cursor(): _uPlot.Cursor {
        return this._cursor;
    }
    @Input() tooltips: boolean = true;
    _legend: boolean = false;
    @Input() set legend(val: boolean) {
        this._legend = val;
        if (this.options.legend) {
            this.options.legend.show = val;
        }else {
            this.options.legend = {show: val};
        }
        this.makeChart(this.data);
    }
    get legend(): boolean {
        return this._legend;
    }
    @Input() align: number | Array<number> = 0;
    _type: ChartType = 'line';
    @Input() set type(value: ChartType) {
        this._type = value;
        this.options.series.forEach((series: any, index: number) => {
            if (typeof value === 'string') {
                series.paths = this.getTypeFunction(value);
            } else {
                series.paths = this.getTypeFunction(value[index], index);
            }
        });
        this.makeChart(this.data);
    }
    get type(): ChartType {
        return this._type;
    }
    @Input()
    set data(value: any) {
        this._details = value?.data;
        try {
            const labels = value?.meta?.map((i: any) => i.name);
            this._details = this._details?.map((d: any) => {
                return Object.values(d);
            });
            const out: any[] = [];
            for (let i = 0; i < this._details.length; i++) {
                for (let j = 0; j < this._details[i].length; j++) {
                    if (!out[j]) {
                        out[j] = [];
                    }
                    const n = this._details[i][j];
                    out[j].push(!isNaN(n) ? +n : null);
                }
            }
            const series: any = out.map((i, k) => ({
                label: labels[k],
                stroke: this.randColor(),
                width: 1 / devicePixelRatio,
                fill: 'rgba(0,255,0,0.1)',
            }));
            series[2].dash = [10, 5]
            this.options.series = [{}, ...series];

            this.options.plugins = [
                this.tooltipPlugin({x:10, y:10})
            ];
            console.log('this.opts.series', this.options.series);
            this._details = [[...Array(value?.data?.length).keys()], ...out];
            console.log('FORMATTED:this._details => ', this._details);
            this.makeChart(this._details);
        } catch (e) {}
    }
    get data(): any {
        return this._details;
    }

    @ViewChild('chartUPlot', { static: true }) chartUPlot: any | HTMLElement;
    constructor() {
        console.log(this.data);
    }

    randColor() {
        return '#000000'.replace(/0/g, function () {
            return (~~(Math.random() * 16)).toString(16);
        });
    }
    makeChart(data: any = this.chartData) {
        if (data) {
            this.chartData = data;
        } else {
            return;
        }

        this.chartUPlot.nativeElement.innerHTML = '';

        const opts = this.options;
        opts.width = this.chartUPlot.nativeElement.clientWidth;
        opts.height = this.chartUPlot.nativeElement.clientHeight || 600;

        this.uPlotChart = new uPlot(opts, data, this.chartUPlot.nativeElement);
    }

    __hostWidth = 0;
    updateChecker() {
        requestAnimationFrame(() => {
            if (
                this.__hostWidth !== this.chartUPlot.nativeElement.clientWidth
            ) {
                this.__hostWidth = this.chartUPlot.nativeElement.clientWidth;
                this.makeChart(this.data);
            }
            this.updateChecker();
        });
    }
    ngAfterViewInit() {
        this.makeChart(this.data);
        this.updateChecker();
    }
    getTypeFunction(type: ChartType, index: number = 0) {
        const align =
            typeof this.align === 'number' ? this.align : this.align[index];
        switch (type) {
            case 'line':
                return uPlot.paths.linear({ align });
            case 'bar':
                return uPlot.paths.bars({ align });
            case 'stepped':
                return uPlot.paths.stepped({ align });
            case 'spline':
                return uPlot.paths.spline({ align });
            case 'points':
                return uPlot.paths.points({ align });
            default:
                return uPlot.paths.linear({ align: this.align });
        }
    }
    tooltipPlugin({ shiftX = 10, shiftY = 10}: any) {
        let tooltipLeftOffset = 0;
        let tooltipTopOffset = 0;

        const tooltip = document.createElement("div");
        tooltip.className = "u-tooltip";

        let seriesIdx: any  = null;
        let dataIdx: any  = null;

        const fmtDate = uPlot.fmtDate("{M}/{D}/{YY} {h}:{mm}:{ss} {AA}");

        let over: any;

        let tooltipVisible = false;

        const showTooltip = () => {
            if (!tooltipVisible) {
                tooltip.style.display = "block";
                // over.style.cursor = "pointer";
                tooltipVisible = true;
            }
        }

        const hideTooltip = () => {
            this.hideTooltip.emit()
            if (tooltipVisible) {
                tooltip.style.display = "none";
                over.style.cursor = null;
                tooltipVisible = false;
            }
        }

        const setTooltip = (u: _uPlot) => {
            showTooltip();

            if (this.customTooltip) {
                this.showTooltip.emit(
                    {
                        currentPoint: u.data[seriesIdx][dataIdx],
                        data: u.data
                    }
                )
            } else {
                let top = u.valToPos(u.data[seriesIdx][dataIdx] as any, 'y');
                let lft = u.valToPos(u.data[        0][dataIdx], 'x');

                tooltip.style.top  = (tooltipTopOffset  + top + shiftX) + "px";
                tooltip.style.left = (tooltipLeftOffset + lft + shiftY) + "px";

                let num = uPlot.fmtNum(u.data[seriesIdx][dataIdx]);
                if (isNaN(num)) {
                    num = ''
                }

                tooltip.textContent = (
                    fmtDate(new Date(u.data[0][dataIdx] * 1e3)) + (num ? " - " + num : '')
                );
            }
        }

        return {
            hooks: {
                ready: [
                    (u: _uPlot) => {
                        over = u.over;
                        tooltipLeftOffset = parseFloat(over.style.left);
                        tooltipTopOffset = parseFloat(over.style.top);
                        u?.root?.querySelector(".u-wrap")?.appendChild(tooltip);

                        let clientX: number;
                        let clientY: number;

                    }
                ],

                setCursor: [
                    (u: _uPlot) => {
                        let c = u.cursor;
                        if (dataIdx != c.idx) {
                            dataIdx = c.idx;
                            if (seriesIdx !== null) {
                                setTooltip(u);
                            }
                        }
                    }
                ],
                setSeries: [
                    (u:_uPlot, sidx: any) => {
                        console.log('test')
                        if (seriesIdx != sidx) {
                            seriesIdx = sidx;

                            if (sidx == null) {
                                hideTooltip();
                            }
                            else if (dataIdx != null) {
                                setTooltip(u);
                            }
                        }
                    }
                ],
            }
        };
    }

}
