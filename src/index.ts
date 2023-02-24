type RenderingOptions = {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
}

class Ball {
    private _lastRender: number
    private _vx: number
    private _vy: number
    constructor(
        private _x: number,
        private _y: number,
        private _radius: number,
        private _dx: number,
        private _dy: number,
        private _color: string,
    ) { 
        this._lastRender = Date.now()
        this._vx = 0
        this._vy = 0
    }

    draw({ canvas, ctx }: RenderingOptions, t: number) {
        const midRadius = Math.round(this._radius / 2)

        this._vx = ((t - this._lastRender) * this._dx);
        this._vy = ((t - this._lastRender) * this._dy);
        this._lastRender = t;

        balls.forEach(ball => {
            if (ball === this) return;

            if (this._x - ball._x < -1000 || this._x - ball._x > 1000) {
                this._vx -= (ball._dx * Math.random());
            }

            if (this._x- ball._x > -100 || this._x - ball._x < 100) {
                this._vx += (ball._dx * Math.random());
            }

            if (this._y - ball._y < -1000 || this._y - ball._y > 1000) {
                this._vy -= (ball._dy * Math.random());
            }

            if (this._y - ball._y > -100 || this._y - ball._y < 100) {
                this._vy += (ball._dy * Math.random());
            }
        })

        let nextPos = this._x + this._vx;
        if (nextPos + midRadius < 0 || nextPos - midRadius >= canvas.width) {
            this._vx = -this._vx;
            this._dx = -this._dx;
        }

        nextPos = this._y + this._vy;
        if (nextPos < 0 || nextPos >= canvas.height) {
            this._vy = -this._vy;
            this._dy = -this._dy;
        }

        this._x += this._vx;
        this._y += this._vy;
        

        ctx.fillStyle = this._color;
        ctx.beginPath();
        ctx.arc(this._x, this._y, this._radius, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fill();

    }

    static create(canvas: HTMLCanvasElement): Ball {
        return new Ball(Math.floor(Math.random() * canvas.width), Math.floor(Math.random() * canvas.height), Math.floor(Math.random() * 30) + 5, Math.random(), Math.random(), randomColor())
    }
}

function resizeCanvas(canvas?: HTMLCanvasElement) {
    const _canvas: HTMLCanvasElement = canvas ?? document.getElementById('canvas') as HTMLCanvasElement;
    _canvas.width = document.documentElement.clientWidth;
    _canvas.height = document.documentElement.clientHeight;
}


function randomColor(): string {
    const r: number = Math.floor(Math.random() * 255);
    const g: number = Math.floor(Math.random() * 255);
    const b: number = Math.floor(Math.random() * 255);

    return `#${toHexaString(r)}${toHexaString(g)}${toHexaString(b)}`
}

function toHexaString(x: number) {
    return x.toString(16).padStart(2, "0");
}

function draw(options: RenderingOptions, t: number) {
    drawBackground(options, sinusoidalColor(t))
    balls.forEach(ball => ball.draw(options, t))
    requestAnimationFrame(() => {
        draw(options, Date.now())
    })
}

function drawBackground(options: RenderingOptions, color: string) {
    const { canvas, ctx } = options;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width - 1, canvas.height - 1);
}

function sinusoidalColor(t: number) {
    const r: number = Math.floor(Math.sin(t / 1000) * 127) + 127;
    const g: number = Math.floor(Math.sin((t + 333) / 1000) * 127) + 127;
    const b: number = Math.floor(Math.sin((t + 666) / 1000) * 127) + 127;
    return `#${toHexaString(r)}${toHexaString(g)}${toHexaString(b)}`
}

const balls: Ball[] = [];
function setup(nbBalls: number): RenderingOptions {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (ctx === null) throw new Error("CTX NULL");

    resizeCanvas();

    const result = { canvas, ctx }

    for (let index = 0; index < nbBalls; index++) {
       balls.push(Ball.create(canvas))
    }

    draw(result, Date.now());
    window.onresize = () => {
        resizeCanvas();
        draw(result, Date.now());
    }

    return result;
}

function main() {
    const options = setup(10);
    requestAnimationFrame(() => {
        draw(options, Date.now())
    })
}

main()

export {}