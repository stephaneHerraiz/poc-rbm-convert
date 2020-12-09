import { Component, OnInit, ɵConsole } from '@angular/core';
import * as d3 from 'd3';
import { setgid } from 'process';
import map from '../../assets/out3.json';
import { DsMapViewerScaleBy } from './enums/ds-map-viewer-scale-by.enum';
import { DsMapViewerScaleExtent } from './enums/ds-map-viewer-scale-extent.enum';

@Component({
  selector: 'app-viewer-rbm-d3',
  templateUrl: './viewer-rbm-d3.component.html',
  styleUrls: ['./viewer-rbm-d3.component.scss']
})

// export interface DsD3ZoomTransformInterface {
//   // The translate x coordinate.
//   x: number;
//   // The translate y coordinate.
//   y: number;
//   // The scale.
//   k: number;
// }

export class ViewerRbmD3Component implements OnInit {
  constructor() { }

  /**
   * The main svg container reference.
   */
  public svg;

  public g;

  tooltip;

  /**
   * The zoom container reference.
   */
  public zoomContainer: d3.Selection<SVGElement, unknown, null, undefined>;

  /**
   * The main image container reference.
   */
  public imageContainer: d3.Selection<SVGElement, unknown, null, undefined>;

  /**
   * The D3 zoom behavior object that handles zoom.
   */
  public imageZoom: d3.ZoomBehavior<Element, unknown>;

  /**
   * Object keeping track of the current transform.
   */
  // public currentZoomTransform: DsD3ZoomTransformInterface = { x: 0, y: 0, k: 1 };

  private createSvg() {
    this.svg = d3.select('#map-container')
    .append('svg')
    .attr('width', 1196)
    .attr('height', 842);

    this.svg.call(
      d3.zoom()
        .extent([[0, 0], [1196, 842]])
        .scaleExtent([1, 100])
        .on('zoom', this.zoom.bind(this))
    );
  }

  ngOnInit() {
    this.createSvg();
    this.g = this.svg.append('g');

    this.tooltip =  d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('opacity', 1)
    .style('position', 'absolute')
    .style('text-align', 'center')
    .style('width', '260px')
    .style('height', '30px')
    .style('padding', '2px')
    .style('font', '12px sans-serif')
    .style('background', 'lightsteelblue')
    .style('border', ' 0px')
    .style('border-radius', '8px')
    .style('pointer-events', 'none');

    map.lines.forEach((segment, index) => {
      let color = segment.c;
      if (color === '#ffffff') {
        color = '#000000';
      }
      this.g.append('line')
      .attr('x1', segment.o.x)
      .attr('y1', segment.o.y)
      .attr('x2', segment.e.x)
      .attr('y2', segment.e.y)
      .attr('index', index)
      .style('stroke', color)
      .style('stroke-width', 0.05)
      .on('click', this.clicked.bind(this))
      .on('mouseover', (e) => {
        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        const seg = map.lines[e.target.attributes.index.value];
        this.tooltip.html(`x1:${seg.o.x},y1:${seg.o.y}<br>x2:${seg.e.x},y2:${seg.e.y}`)
            .style('left', (e.pageX - 50) + 'px')
            .style('top', (e.pageY - 50) + 'px')
            .style('color', 'blue');
        d3.select(e.target).transition().style('stroke', 'blue');
      })
      .on('mouseout', (d) => {
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        d3.select(d.target).transition().style('stroke', color);
      });
    });

    map.paths.forEach((segments, index) => {
      let color = segments[0].c;
      if (color === '#ffffff') {
        color = '#000000';
      }
      this.g.append('path')
      .attr('d', this.draw(d3.path(), segments))
      .attr('index', index)
      .style('stroke', color)
      .style('stroke-width', 0.05)
      .on('mouseenter', (e) => {
        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        const path = map.paths[e.target.attributes.index.value];
        this.tooltip.html(`x:${path[0].o.x},y:${path[0].o.y}`)
            .style('left', (e.pageX - 50) + 'px')
            .style('top', (e.pageY - 50) + 'px')
            .style('color', 'blue');
        d3.select(e.target).transition().style('stroke', 'blue');
      })
      .on('mouseout', (d) => {
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        d3.select(d.target).transition().style('stroke', color);
      });
    });

  }

  private draw(context, data) {
    data.forEach(segment => {
      context.moveTo(segment.o.x, segment.o.y); // move current point to ⟨10,10⟩
      context.lineTo(segment.e.x, segment.e.y); // draw straight line to ⟨100,10⟩
    });
    return context;
  }

  private clicked(e) {
    d3.select(e.target).transition().style('stroke', 'blue');
    const seg = map.lines[e.target.attributes.index.value];
    this.tooltip.html(`x1:${seg.o.x},y1:${seg.o.y}<br>x2:${seg.e.x},y2:${seg.e.y}`)
        .style('left', (e.pageX - 50) + 'px')
        .style('top', (e.pageY - 50) + 'px')
        .style('color', 'blue');
  }

  private zoom(event) {
    const {transform} = event;
    this.g.attr('transform', transform);
    // this.g.attr('stroke-width', 1 / transform.k);
  }

}
