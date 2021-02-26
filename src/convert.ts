import * as fs from 'fs';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';

const SECTION_BASE_LENGTH = 6;

interface Section {
    type: number;
    length: number
  }

interface Header {
    monochrome?: boolean 
}

interface Transformation {
    matrice: Buffer
}

class Mask {
    points: Point[] = []
}

class Point {
    x: number = 0;
    y: number = 0;
    toObject() {
        return { x: this.x, y: this.y};
    }
}

class Layer {
    index: number = 0;
    name: string = '';
    segmentsLength: number = 0;
    trianglesLength: number = 0;
    quadrilateralsLength: number = 0;
}

class Vertices {
    name: string ='';
    index?: number = 0;
    segmentsLength: number = 0;
    trianglesLength: number = 0;
    quadrilateralsLength: number = 0;
    segments: Segment[] = [];
    triangles: Triangle[] = [];
    quadrilaterals: Quadrilateral[] = [];
}
class Vertice {
    layers: number[] = [];
    // color: bigint = BigInt(0);
    color: Color = {
        alpha: 0,
        red: 0,
        green: 0,
        blue: 0
    }

    colorHex () :string {
        return `#${this.rgbToHex(this.color.red)}${this.rgbToHex(this.color.green)}${this.rgbToHex(this.color.blue)}`;
    }

    private rgbToHex (rgb: number): string { 
        let hex = Number(rgb).toString(16);
        if (hex.length < 2) {
             hex = '0' + hex;
        }
        return hex;
      }
}

interface Color {
    alpha: number,
    red: number,
    green: number,
    blue: number
}

class Segment extends Vertice {
    origin: Point;
    textureOrigin: Point;
    end: Point;
    textureEnd: Point;
    constructor() {
        super();
        this.origin = new Point();
        this.textureOrigin = new Point();
        this.end = new Point();
        this.textureEnd = new Point();
    }
    toObject() {
        return {
            o: this.origin.toObject(),
            e: this.end.toObject(),
            c: this.colorHex()
        }
    }
}



class Triangle extends Vertice {
    a: Point;
    b: Point;
    c: Point;
    points: Point[];
    constructor() {
        super();
        this.a = new Point();
        this.b = new Point();
        this.c = new Point();
        this.points = [];
        this.points.push(this.a, this.b, this.c);
    }
}

class Quadrilateral extends Vertice {
    points: Point[] = [];
}

class Texture {
    buffer: Buffer;
    constructor() {
        this.buffer = Buffer.alloc(0);
    }
}

class Rbm {

    version: number = 0;
    header: Header = {};
    transformation = <Transformation>{};
    mask :Mask;
    layers: Layer[];
    texture: Texture;
    vertices: Vertices;

    constructor() {
        this.mask = new Mask();
        this.layers = [];
        this.texture = new Texture();
        this.vertices = new Vertices();
    }


    public async open (file: string): Promise<void> {
        return new Promise( async (resolve, reject) => {
            const rbm: Buffer = await fs.promises.readFile(file);
            if (!this.isFileValid(rbm)) {
                return reject();
            }

            const version = this.getVersion(rbm);
            if (version === null) {
                return Error();
            } else {
                this.version = version;
            }
            console.log(`RBM version: ${this.version}`);
            let p = 6;
            while (p < rbm.length) {
                const buf = rbm.slice(p);
                const section = this.readSection(buf);
                p = p + section.length + SECTION_BASE_LENGTH;
            }

            return resolve();
        });
    }

    public async convert(path: string = `out.svg`) {
        return new Promise( async (resolve) => {
            const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
            let body = d3.select(dom.window.document.querySelector("body"))
            let svg = body
                .append('svg')
                .attr("width", 1196)
                .attr("height", 842)
                .attr('xmlns', 'http://www.w3.org/2000/svg');
            this.vertices.segments.forEach( segment => {
                let color = 'black';
                if (!this.header.monochrome){
                    color = segment.colorHex();
                    if (color === '#ffffff') {
                        color = '#000000';
                    }
                }
                svg.append("line")
                .attr("x1", segment.origin.x)
                .attr("y1", segment.origin.y)
                .attr("x2", segment.end.x) 
                .attr("y2", segment.end.y)
                .style("stroke", color)
                .style("stroke-width", 0.1);
            })
            this.vertices.triangles.forEach( triangle => {
                let color = 'black';
                if (!this.header.monochrome){
                    color = triangle.colorHex();
                    if (color === '#ffffff') {
                        color = '#000000';
                    }
                }
                svg.append("line")
                .attr("x1", triangle.a.x)
                .attr("y1", triangle.a.y)
                .attr("x2", triangle.b.x) 
                .attr("y2", triangle.b.y)
                .attr("stroke", color)
                .style("stroke-width", 0.1);
                svg.append("line")
                .attr("x1", triangle.c.x)
                .attr("y1", triangle.c.y)
                .attr("x2", triangle.b.x) 
                .attr("y2", triangle.b.y)
                .attr("stroke", color)
                .style("stroke-width", 0.1);
                svg.append("line")
                .attr("x1", triangle.a.x)
                .attr("y1", triangle.a.y)
                .attr("x2", triangle.c.x)
                .attr("y2", triangle.c.y)
                .attr("stroke", color)
                .style("stroke-width", 0.1);
            
            });

            await fs.promises.writeFile(path, body.html());
            resolve();
        });

    }

    private isFileValid(rbm: Buffer): boolean {
        // Check uf the file leght is a minimum of 4 bytes
        if( rbm.byteLength < 4 ) {
            return false;
        }
        // Check if the first 4 bytes correspond to RBM(0x00) (=52 42 4D 00 = 1380076800)
        let res = rbm.readInt32BE(0);
        if (res !== 1380076800) {
            return false
        }
        return true;
    }

    private getVersion(rbm: Buffer): number|null {
        // Check uf the file leght is a minimum of 6 bytes
        if( rbm.byteLength < 6 ) {
            return null;
        }
        if (rbm.readUInt8(5) !== 0) {
            return null;
        }
        return rbm.readUInt8(4);
    }

    private readSection(buffer: Buffer): Section {
        const section :Section = {
            type : buffer.readUInt16LE(0),
            length : buffer.readUInt32LE(2)
        };
        let data = Buffer.alloc(section.length);
        buffer.copy(data,0,SECTION_BASE_LENGTH,SECTION_BASE_LENGTH + section.length);
        if (section.type === 0) {
            if ( this.version > 1) {
                this.header.monochrome = data.readUInt8(0) > 0 ? true : false;
            }
        } else if (section.type === 10) {
            this.transformation.matrice = data;

        } else if (section.type === 11) {
            for (let i = 0; i < data.readUInt16LE(0); i++) {
                const point = new Point();
                let index = 2 + (i * 2 * 8)
                point.x = data.readDoubleLE(index);
                index += 8;
                point.y = data.readDoubleLE(index);
                this.mask.points.push(point);
            }
            

        } else if (section.type === 12) {
            let layerCount = 0
            if (data.readUInt8(0) === 0) {
                layerCount = 1;
            } else {
                layerCount = data.readUInt8(0);
            }

            let index = 1;
            for(let i = 0; i < layerCount; i++) {
                const layer = new Layer();
                data = data.slice(index);
                index = 1;
                const strEnd = data.indexOf(0);
                layer.name = data.slice(0, strEnd).toString('ascii');
                index += strEnd + 1
                layer.segmentsLength = data.readUInt32LE(index);
                index += 4;
                layer.trianglesLength = data.readUInt32LE(index);
                index += 4;
                layer.quadrilateralsLength = data.readUInt32LE(index);
                index += 4;
                layer.index = i;
                this.layers.push(layer);
            }

        } else if (section.type === 13) {
            this.texture.buffer = Buffer.alloc(data.length, 'ascii');
            this.texture.buffer.copy(data);

        } else if (section.type === 20) {
            let index = 0;
            this.vertices.segmentsLength = data.readUInt32LE(index);
            index += 4;
            this.vertices.trianglesLength = data.readUInt32LE(index);
            index += 4;
            this.vertices.quadrilateralsLength = data.readUInt32LE(index);
            index += 4;

            for (let i = 0; i < this.vertices.segmentsLength; i++) {
                const segment = new Segment();
                if (this.layers.length > 1) {
                    const layerCount = data.readInt8(index);
                    index++;
                    for( let l = 0; l < layerCount; l++) {
                        segment.layers.push(data.readUInt8(index));
                        index++;
                    }
                }
                if (!this.header.monochrome) {
                    segment.color.blue = data.readUInt8(index);
                    index ++;
                    segment.color.green = data.readUInt8(index);
                    index ++;
                    segment.color.red = data.readUInt8(index);
                    index ++;
                    segment.color.alpha = data.readUInt8(index);
                    index ++;
                }
                segment.origin.x = data.readFloatLE(index);
                index += 4;
                segment.origin.y = data.readFloatLE(index);
                index += 4;
                segment.textureOrigin.x = data.readFloatLE(index);
                index += 4;
                segment.textureOrigin.y = data.readFloatLE(index);
                index += 4;
                segment.end.x = data.readFloatLE(index);
                index += 4;
                segment.end.y = data.readFloatLE(index);
                index += 4;
                segment.textureEnd.x = data.readFloatLE(index);
                index += 4;
                segment.textureEnd.y = data.readFloatLE(index);
                index += 4;
                this.vertices.segments.push(segment);
            }

            for (let i = 0; i < this.vertices.trianglesLength; i++) {
                const triangle = new Triangle();
                if (this.layers.length > 1) {
                    const layerCount = data.readUInt8(index);
                    index++;
                    for( let l = 0; l < layerCount; l++) {
                        triangle.layers.push(data.readInt8(index));
                        index++;
                    }
                }
                if (!this.header.monochrome) {
                    triangle.color.blue = data.readUInt8(index);
                    index ++;
                    triangle.color.green = data.readUInt8(index);
                    index ++;
                    triangle.color.red = data.readUInt8(index);
                    index ++;
                    triangle.color.alpha = data.readUInt8(index);
                    index ++;
                }
                triangle.a.x = data.readFloatLE(index);
                index += 4;
                triangle.a.y = data.readFloatLE(index);
                index += 4;
                triangle.b.x = data.readFloatLE(index);
                index += 4;
                triangle.b.y = data.readFloatLE(index);
                index += 4;
                triangle.c.x = data.readFloatLE(index);
                index += 4;
                triangle.c.y = data.readFloatLE(index);
                index += 4;
                this.vertices.triangles.push(triangle);
            }

            for (let i = 0; i < this.vertices.quadrilateralsLength; i++) {
                const quadrilateral = new Quadrilateral();
                if (this.layers.length > 1) {
                    const layerCount = data.readInt8(index);
                    index++;
                    for( let l = 0; l < layerCount; l++) {
                        quadrilateral.layers.push(data.readUInt8(index));
                        index++;
                    }
                }
                if (!this.header.monochrome) {
                    quadrilateral.color.blue = data.readUInt8(index);
                    index ++;
                    quadrilateral.color.green = data.readUInt8(index);
                    index ++;
                    quadrilateral.color.red = data.readUInt8(index);
                    index ++;
                    quadrilateral.color.alpha = data.readUInt8(index);
                    index ++;
                }
                const a = new Point();
                a.x = data.readFloatLE(index);
                index += 4;
                a.y = data.readFloatLE(index);
                index += 4;
                const b = new Point();
                b.x = data.readFloatLE(index);
                index += 4;
                b.y = data.readFloatLE(index);
                index += 4;
                const c = new Point();
                c.x = data.readFloatLE(index);
                index += 4;
                c.y = data.readFloatLE(index);
                index += 4;
                const d = new Point();
                d.x = data.readFloatLE(index);
                index += 4;
                d.y = data.readFloatLE(index);
                index += 4;
                quadrilateral.points.push(a, b, c, d)
                this.vertices.quadrilaterals.push(quadrilateral);
            }

        } else {
            console.error(`Section type ${section.type} unknown...`)
        }
        return section
    }
    
}

const start = async () => {
    const rbm = new Rbm();
    const path = `./test/test2/R+4_2401/file.rbm`;
    process.stdout.write(`read ${path} file...\n`);
    await rbm.open(path);
    const paths: Segment[][] = [];
    const lines = [];
    const segmentslength = rbm.vertices.segments.length
    process.stdout.write(`Found ${segmentslength} segments\n`);
    while (rbm.vertices.segments.length > 0) {
        process.stdout.write(`Search for paths in segments ${Math.round(100 * (segmentslength - rbm.vertices.segments.length) / segmentslength)}%\r`);
        let path :Segment[] = [];
        let segment = rbm.vertices.segments[0];
        rbm.vertices.segments.splice(0, 1);
        path.push(segment);
        let isLine = true;
        while (rbm.vertices.segments.length > 0) {
            let index = rbm.vertices.segments.findIndex(seg => {
                return (segment.end.x === seg.origin.x 
                    && segment.end.y === seg.origin.y 
                    && segment.colorHex() === seg.colorHex())
            });
            if (index >= 0) {
                segment = rbm.vertices.segments[index];
                path.push(rbm.vertices.segments[index]);
                rbm.vertices.segments.splice(index, 1);
                isLine = false;
            } else {
                let pathindex = paths.findIndex(p => {
                    return (segment.end.x === p[0].origin.x 
                        && segment.end.y === p[0].origin.y
                        && segment.colorHex() === p[0].colorHex())
                });
                if (pathindex >= 0) {
                    path = path.concat(paths[pathindex]);
                    paths.splice(pathindex, 1);
                    isLine = false;
                } else {
                    pathindex = paths.findIndex(p => {
                        return (segment.origin.x === p[p.length - 1].end.x 
                            && segment.origin.y === p[p.length - 1].end.y
                            && segment.colorHex() === p[p.length - 1].colorHex())
                    });
                    if (pathindex >= 0) {
                        path = paths[pathindex].concat(path);
                        paths.splice(pathindex, 1);
                        isLine = false;
                    }
                }
                break;
            }
        }
        if (isLine) {
            lines.push(segment);
        } else {
            paths.push(path);
        }
    }
    process.stdout.write(`Found ${paths.length} SVG paths in segments     \n`);
    let count = 0;
    paths.forEach(path => {
        count += path.length;
    })
    process.stdout.write(`Found ${count} segments are in paths\n`);
    process.stdout.write(`Found ${lines.length} segments are lines\n`);
    
    process.stdout.write(`Optimise SVG path...\n`);
    process.stdout.write(`Remove collinear segments in paths...\n`);
    // remove collinear segemnts in paths
    paths.forEach(path => {
        let i = 0
        while(i < path.length - 1) {
            if ( (path[i].end.y - path[i].origin.y) / (path[i].end.x - path[i].origin.x) === (path[i + 1].end.y - path[i].origin.y) / (path[i + 1].end.x - path[i].origin.x)) {
                path[i].end.x = path[i + 1].end.x;
                path[i].end.y = path[i + 1].end.y;
                path.splice(i + 1,1);
            }
            i++;
        }
    })
    let optimiseCount = 0;
    paths.forEach(path => {
        optimiseCount += path.length;
    })
    process.stdout.write(`Optimise result: reduce ${Math.round(100* (count - optimiseCount)/count)}% (${optimiseCount - count}) segments in paths\n`);

    const pathsObject = paths.map(path => {
        return path.map(seg => {
            return seg.toObject();
        });
    });

    const linesObject = lines.map(seg => {
        return seg.toObject();
    });

    //await rbm.convert();
    process.stdout.write(`Writting output file...\r`);
    await fs.promises.writeFile('./viewer/rbm-viewer/src/assets/out3.json',JSON.stringify({
        paths: pathsObject,
        lines: linesObject
    }));
    process.stdout.write(`Output file done             \n`);
} 

start();

