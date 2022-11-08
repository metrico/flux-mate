import { MatTooltipModule } from '@angular/material/tooltip';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeFilterComponent } from './tree-filter.component';
import { MatTreeModule } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { HtmlPipe } from './html.pipe';
// import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling'
import { ScrollingModule } from '@angular/cdk/scrolling';
@NgModule({
    imports: [
        CommonModule,
        MatTreeModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatTooltipModule,
        FormsModule,
        // CdkVirtualScrollViewport,
        ScrollingModule
    ],
    declarations: [
        TreeFilterComponent,
        HtmlPipe
    ],
    exports: [TreeFilterComponent]
})
export class TreeFilterModule { }
