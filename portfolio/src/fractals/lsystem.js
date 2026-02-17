/**
 * L-System Tree Renderer - Turtle Graphics
 * Implements fractal tree using L-System string expansion and turtle graphics
 */

/**
 * Generate L-System string by expanding axiom with rules
 * @param {string} axiom - Starting string
 * @param {Object} rules - Substitution rules { 'F': 'FF-[-F+F+F]+[+F-F-F]', ... }
 * @param {number} iterations - Number of expansion iterations
 * @returns {string} Expanded L-System string
 */
function generateLSystem(axiom, rules, iterations) {
  let current = axiom

  for (let i = 0; i < iterations; i++) {
    let next = ''
    for (const char of current) {
      next += rules[char] || char
    }
    current = next
  }

  return current
}

/**
 * Convert L-System string to list of drawing commands
 * @param {string} lsystemString - L-System string
 * @param {number} angle - Rotation angle in degrees
 * @returns {Array} Array of commands: { type: 'forward'|'turn'|'push'|'pop', value?: number }
 */
function toCommands(lsystemString, angle) {
  const commands = []

  for (const char of lsystemString) {
    switch (char) {
      case 'F':
        commands.push({ type: 'forward' })
        break
      case '+':
        commands.push({ type: 'turn', value: angle })
        break
      case '-':
        commands.push({ type: 'turn', value: -angle })
        break
      case '[':
        commands.push({ type: 'push' })
        break
      case ']':
        commands.push({ type: 'pop' })
        break
    }
  }

  return commands
}

/**
 * Draw commands using turtle graphics
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} commands - Commands to draw
 * @param {number} progress - Progress value (0-1) indicating how much to draw
 * @param {Object} options - Rendering options
 * @param {number} options.startX - Starting X position
 * @param {number} options.startY - Starting Y position
 * @param {number} options.stepLength - Initial step length
 * @param {string} options.color - Branch color
 */
function drawCommands(ctx, commands, progress, options = {}) {
  const {
    startX = ctx.canvas.width / 2,
    startY = ctx.canvas.height,
    stepLength = 15,
    color = '#00f5d4',
  } = options

  // Calculate how many commands to draw
  const commandsToRender = Math.floor(commands.length * progress)
  if (commandsToRender === 0) return

  // Turtle graphics state
  const stack = []
  let x = startX
  let y = startY
  let angle = 90 // Start pointing upward
  let depth = 0 // Track depth for line width

  // Calculate depth of each command for line width variation
  const commandDepths = calculateCommandDepths(commands)

  for (let i = 0; i < commandsToRender; i++) {
    const cmd = commands[i]
    const currentDepth = commandDepths[i]

    switch (cmd.type) {
      case 'forward': {
        const nextX = x + Math.cos((angle * Math.PI) / 180) * stepLength
        const nextY = y - Math.sin((angle * Math.PI) / 180) * stepLength

        // Color varies from trunk (darker) to tips (brighter)
        const colorAlpha = 0.5 + (1 - currentDepth / 10) * 0.5
        ctx.strokeStyle = color
        ctx.globalAlpha = colorAlpha
        ctx.lineWidth = Math.max(1, 3 - currentDepth / 2)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(nextX, nextY)
        ctx.stroke()

        x = nextX
        y = nextY
        break
      }

      case 'turn':
        angle += cmd.value
        break

      case 'push':
        stack.push({ x, y, angle })
        depth++
        break

      case 'pop':
        if (stack.length > 0) {
          const state = stack.pop()
          x = state.x
          y = state.y
          angle = state.angle
          depth--
        }
        break
    }
  }

  ctx.globalAlpha = 1
}

/**
 * Calculate depth of each command for visual variation
 * Depth increases when entering branches [push] and decreases when exiting [pop]
 */
function calculateCommandDepths(commands) {
  const depths = new Array(commands.length).fill(0)
  let currentDepth = 0

  for (let i = 0; i < commands.length; i++) {
    depths[i] = currentDepth
    if (commands[i].type === 'push') {
      currentDepth++
    } else if (commands[i].type === 'pop' && currentDepth > 0) {
      currentDepth--
    }
  }

  return depths
}

/**
 * Render L-System tree
 * @param {HTMLCanvasElement} canvas - Canvas to render on
 * @param {Object} options - Configuration
 * @param {number} options.progress - Animation progress (0-1)
 * @param {string} options.color - Color for branches (default: '#00f5d4')
 * @param {number} options.iterations - L-System iterations (default: 5)
 */
export function renderLSystem(canvas, options = {}) {
  const {
    progress = 0,
    color = '#00f5d4',
    iterations = 5,
  } = options

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (progress === 0) return

  // Use cache key based on iterations to avoid regenerating L-system on each frame
  const cacheKey = `lsystem_${iterations}`

  // Generate or retrieve cached L-System data
  if (!canvas._fractalCache) {
    canvas._fractalCache = {}
  }

  let cachedData = canvas._fractalCache[cacheKey]
  if (!cachedData) {
    // Generate L-System
    const axiom = 'F'
    const rules = {
      F: 'FF-[-F+F+F]+[+F-F-F]',
    }
    const angle = 25

    const lsystemString = generateLSystem(axiom, rules, iterations)
    const commands = toCommands(lsystemString, angle)

    cachedData = {
      commands,
      lsystemString,
      angle,
    }
    canvas._fractalCache[cacheKey] = cachedData
  }

  // Draw based on progress
  drawCommands(ctx, cachedData.commands, progress, {
    startX: canvas.width / 2,
    startY: canvas.height - 20, // Anchor near bottom
    stepLength: 12,
    color,
  })
}
