import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

@Component({
    selector: 'app-monaco-wrapper',
    templateUrl: './monaco-wrapper.component.html',
    styleUrls: ['./monaco-wrapper.component.scss']
})
export class MonacoWrapperComponent implements OnInit {
    _sqlRequest: any = '';
    @Input()
    set sqlRequest(value: string) {
        this.code = value;
    }
    get sqlRequest(): string {
        return this.code;
    }

    @Output() sqlRequestChange: any = new EventEmitter<string>();
    @Output() ready: any = new EventEmitter<string>();

    editorOptions = {
        // language: 'planetext',
        language: 'flux',
        theme: 'flux-theme',

        // minimap: false
    };
    code: string = `-- A list of all calls (sorted by employee and start time)
    SELECT *
    FROM call
    ORDER BY
    call.employee_id ASC,
    call.start_time ASC;`;

    constructor() { }

    @HostListener('document:keydown', ['$event'])
    onClickRun(event: any = null) {
        // if (event?.code === 'Escape') {
        //     this.isAutocompleteVisible = false;
        //     this.cdr.detectChanges();
        // }
        // if (event?.ctrlKey && event?.code === 'Space') {
        //     console.log('CTRL + SPACE');
        //     this.textChange();
        //     this.cdr.detectChanges();
        //     return;
        // }

        if (
            event === 'QUERY' || (event?.ctrlKey && event?.code === 'Enter')
        ) {
            console.log('CTRL + ENTER', event);
            // this.isAutocompleteVisible = false;
            console.log('RUN QUERY SELECTION', this.code);
            this.ready.emit(this.code);
            // this.cdr.detectChanges();
        }
    }

    ngOnInit(): void {
        console.log('this.editorOptions', this.editorOptions);
    }

    onInit(editor: any) {
        let line = editor.getPosition();
        console.log(line);
    }
    onChangeCode(event: any) {
        this.code = event;
        console.log({ code: event })
    }
}
