/**
 * Renderer.js - Flurry.Renderer
 * Handles all the low level calls to WebGL
 */

/**
 * Creates a rendering handler, using the given canvas as output
 * @param {string} canvasId
 * @constructor
 */
Flurry.Renderer = function(canvasId)
{
    'use strict';

    /**
     * Reference to the output canvas element
     * @type {HTMLCanvasElement}
     */
    this.canvas = document.getElementById(canvasId);

    /**
     * Core WebGL rendering context and methods
     * @type {WebGLRenderingContext}
     */
    this.gl = this.canvas.getContext('webgl', {
        preserveDrawingBuffer: true,
        depth: false, stencil: false,
        antialias: false, alpha: true//, premultipliedAlpha: false
    });

    /**
     * All shaders used by the renderer
     * @type {WebGLShader[]}
     */
    this.shaders = [];

    /**
     * Attributes that link the arrays and shader data
     */
    this.attributes = {
        position : null,
        color    : null,
        uv       : null
    };

    /**
     * Uniforms that link const data to shaders
     */
    this.uniforms = {
        projMatrix      : {id : 0, matrix: new Float32Array(16)},
        modelViewMatrix : {id : 0, matrix: new Float32Array(16)}
    };

    /**
     * Buffers that link typed arrays to GL buffers
     */
    this.buffers = {
        position : {buffer : null, data : null},
        index    : {buffer : null, data : null},
        color    : {buffer : null, data : null},
        uv       : {buffer : null, data : null}
    };

    this.rect = {
        position : new Float32Array(8),
        color    : new Float32Array([0,0,0,0.1,0,0,0,0.1,0,0,0,0.1,0,0,0,0.1])
    };

    if (!this.gl)
        throw new Error('Could not initialize WebGL');

    var gl   = this.gl,
        GLES = WebGLRenderingContext;

    gl.disable(GLES.DEPTH_TEST);
    gl.disable(GLES.CULL_FACE);
    gl.enable(GLES.BLEND);
};

Flurry.Renderer.prototype.setup = function()
{
    'use strict';
    var gl      = this.gl,
        GLES    = WebGLRenderingContext,
        program = gl.createProgram();

    this.shaders.forEach( function(s) { gl.attachShader(program, s); });
    gl.linkProgram(program);

    if ( !gl.getProgramParameter(program, GLES.LINK_STATUS) )
        throw new Error( gl.getProgramInfoLog(program) );

    gl.useProgram(program);

    this.uniforms.projMatrix.id      = gl.getUniformLocation(program, 'projectionMatrix');
    this.uniforms.modelViewMatrix.id = gl.getUniformLocation(program, 'modelViewMatrix');
    this.attributes.position = gl.getAttribLocation(program, "position");
    this.attributes.color    = gl.getAttribLocation(program, "color");
    this.attributes.uv       = gl.getAttribLocation(program, "uv");

    gl.enableVertexAttribArray(this.attributes.position);
    gl.enableVertexAttribArray(this.attributes.color);
    gl.enableVertexAttribArray(this.attributes.uv);
    this.resize();
};

Flurry.Renderer.prototype.render = function()
{
    'use strict';
    var gl   = this.gl,
        GLES = WebGLRenderingContext;

    // Fade rect
    gl.blendFunc(GLES.SRC_ALPHA, GLES.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(GLES.ARRAY_BUFFER, this.buffers.position.buffer);
    gl.bufferData(GLES.ARRAY_BUFFER, this.rect.position, GLES.STATIC_DRAW);
    gl.vertexAttribPointer(this.attributes.position, 2, GLES.FLOAT, false, 0, 0);

    gl.bindBuffer(GLES.ARRAY_BUFFER, this.buffers.color.buffer);
    gl.bufferData(GLES.ARRAY_BUFFER, this.rect.color, GLES.STATIC_DRAW);
    gl.vertexAttribPointer(this.attributes.color, 4, GLES.FLOAT, false, 0, 0)
    gl.drawArrays(GLES.TRIANGLE_STRIP, 0, 4);

    // Flurry
    gl.blendFunc(GLES.ONE, GLES.ONE);
    gl.bindBuffer(GLES.ARRAY_BUFFER, this.buffers.position.buffer);
    gl.bufferData(GLES.ARRAY_BUFFER, this.buffers.position.data, GLES.DYNAMIC_DRAW);
    gl.vertexAttribPointer(this.attributes.position, 2, GLES.FLOAT, false, 0, 0);

    gl.bindBuffer(GLES.ARRAY_BUFFER, this.buffers.color.buffer);
    gl.bufferData(GLES.ARRAY_BUFFER, this.buffers.color.data, GLES.DYNAMIC_DRAW);
    gl.vertexAttribPointer(this.attributes.color, 4, GLES.FLOAT, false, 0, 0);

    gl.bindBuffer(GLES.ARRAY_BUFFER, this.buffers.uv.buffer);
    gl.bufferData(GLES.ARRAY_BUFFER, this.buffers.uv.data, GLES.DYNAMIC_DRAW);
    gl.vertexAttribPointer(this.attributes.uv, 2, GLES.FLOAT, false, 0, 0);

    gl.bindBuffer(GLES.ELEMENT_ARRAY_BUFFER, this.buffers.index.buffer);
    gl.bufferData(GLES.ELEMENT_ARRAY_BUFFER, this.buffers.index.data, GLES.DYNAMIC_DRAW);
    gl.drawElements(GLES.TRIANGLES, MAX_SMOKE * 2, GLES.UNSIGNED_SHORT, 0);
};

Flurry.Renderer.prototype.useShader = function(id)
{
    'use strict';
    var gl           = this.gl,
        GLES         = WebGLRenderingContext,
        shaderScript = document.getElementById(id),
        shaderText   = shaderScript.innerText,
        shader;

    if (shaderScript.type == "x-shader/x-fragment")
        shader = gl.createShader(GLES.FRAGMENT_SHADER);
    else if (shaderScript.type == "x-shader/x-vertex")
        shader = gl.createShader(GLES.VERTEX_SHADER);
    else
        return null;

    gl.shaderSource(shader, shaderText);
    gl.compileShader(shader);

    if ( !gl.getShaderParameter(shader, GLES.COMPILE_STATUS) )
        throw new Error( gl.getShaderInfoLog(shader) );
    else
        this.shaders.push(shader);
};

Flurry.Renderer.prototype.setBuffer = function(type, data)
{
    'use strict';
    var gl = this.gl;

    this.buffers[type].buffer = gl.createBuffer();
    this.buffers[type].data   = data;
};

Flurry.Renderer.prototype.resize = function()
{
    'use strict';
    console.log("[Renderer] Resizing...");
    var gl     = this.gl,
        width  = window.innerWidth,
        height = window.innerHeight;

    gl.viewport(0, 0, width, height);
    this.canvas.width  = width;
    this.canvas.height = height;

    this.rect.position.set([width, height, 0, height, width, 0, 0, 0]);

    //1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0
    mat4.ortho(this.uniforms.projMatrix.matrix, 0, width, 0, height, -1, 1);
    mat4.identity(this.uniforms.modelViewMatrix.matrix);
    gl.uniformMatrix4fv(this.uniforms.projMatrix.id, false, this.uniforms.projMatrix.matrix);
    gl.uniformMatrix4fv(this.uniforms.modelViewMatrix.id, false, this.uniforms.modelViewMatrix.matrix);
};