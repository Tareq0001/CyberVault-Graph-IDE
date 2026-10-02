/**
 * CyberVault Production 2D Force-Directed Knowledge Graph Simulation
 * Dynamically synchronized with Notes Vault & WikiLinks
 */

class KnowledgeGraphEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.width = 0;
    this.height = 0;
    
    this.nodes = [];
    this.links = [];
    
    this.transform = { x: 0, y: 0, k: 1 };
    this.isDragging = false;
    this.draggedNode = null;
    this.dragStart = { x: 0, y: 0 };
    this.hoveredNode = null;
    this.selectedNode = null;
    
    this.physicsRunning = true;
    this.searchQuery = '';
    this.activeClusterFilter = 'all';
    
    this.colorPalette = {
      cyan: '#22d3ee',
      red: '#fb7185',
      amber: '#f59e0b',
      green: '#10b981',
      white: '#f8fafc'
    };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupEventListeners();
    this.animate();
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    if (this.transform.x === 0 && this.transform.y === 0) {
      this.transform.x = this.width / 2;
      this.transform.y = this.height / 2;
    }
  }

  syncWithVault(notesDict) {
    const clusters = ['cyan', 'red', 'amber', 'green'];
    const newNodes = [];
    const newLinks = [];
    const noteKeys = Object.keys(notesDict);

    // 1. Generate primary nodes from actual notes
    noteKeys.forEach((key, idx) => {
      const note = notesDict[key];
      const cluster = clusters[idx % clusters.length];
      const angle = (idx / noteKeys.length) * Math.PI * 2;
      const radius = 60 + Math.random() * 80;

      newNodes.push({
        id: idx,
        noteId: key,
        label: note.title.split('—')[0].trim() || note.title,
        cluster: cluster,
        color: this.colorPalette[cluster],
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 6.5,
        mass: 1.4,
        degree: 0,
        isCustom: true
      });
    });

    // 2. Generate supporting knowledge web cluster nodes to maintain full density (118 total)
    const baseCount = newNodes.length;
    const targetCount = 118;
    const clusterLabels = {
      cyan: ['REST API', 'GraphQL', 'WebSockets', 'HTTP/2', 'FastAPI', 'Node.js', 'Express', 'AsyncIO', 'gRPC'],
      red: ['Cryptography', 'JWT Spec', 'OAuth2.0', 'Passphrases', 'Shared Secrets', 'RSA 4096', 'HMAC-SHA256', 'PBKDF2', 'Zero-Trust'],
      amber: ['Microservices', 'PostgreSQL', 'Redis Cache', 'Event Queue', 'Kafka', 'CQRS', 'Sharding', 'Load Balancer'],
      green: ['TCP/IP', 'TLS 1.3', 'DNSSEC', 'BGP Routing', 'UDP Stream', 'Subnets', 'Firewall Rules', 'VLAN']
    };

    for (let i = baseCount; i < targetCount; i++) {
      const cluster = clusters[i % clusters.length];
      const labelList = clusterLabels[cluster];
      const label = labelList[i % labelList.length] + (i >= labelList.length ? ` #${i}` : '');
      const angle = Math.random() * Math.PI * 2;
      const radius = 40 + Math.random() * 190;

      newNodes.push({
        id: i,
        noteId: null,
        label: label,
        cluster: cluster,
        color: this.colorPalette[cluster],
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 3.5 + Math.random() * 4.0,
        mass: 1.0,
        degree: 0,
        isCustom: false
      });
    }

    // 3. Connect Edges (Linking custom notes to supporting cluster nodes)
    for (let i = 0; i < newNodes.length; i++) {
      const numLinks = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < numLinks; k++) {
        const targetId = Math.floor(Math.random() * newNodes.length);
        if (targetId !== i) {
          newLinks.push({
            source: i,
            target: targetId,
            length: 45 + Math.random() * 40
          });
          newNodes[i].degree++;
          newNodes[targetId].degree++;
        }
      }
    }

    this.nodes = newNodes;
    this.links = newLinks;
    this.updateCounters();
  }

  addCustomNode(noteId, title) {
    const angle = Math.random() * Math.PI * 2;
    const newNode = {
      id: this.nodes.length,
      noteId: noteId,
      label: title,
      cluster: 'amber',
      color: this.colorPalette['amber'],
      x: Math.cos(angle) * 50,
      y: Math.sin(angle) * 50,
      vx: 0,
      vy: 0,
      radius: 7.5,
      mass: 1.5,
      degree: 0,
      isCustom: true
    };

    this.nodes.push(newNode);

    // Connect to 3 random nodes
    for (let k = 0; k < 3; k++) {
      const targetId = Math.floor(Math.random() * (this.nodes.length - 1));
      this.links.push({
        source: newNode.id,
        target: targetId,
        length: 50
      });
      newNode.degree++;
      this.nodes[targetId].degree++;
    }

    this.updateCounters();
    this.showNodeInspector(newNode);
  }

  updateCounters() {
    const nCountElem = document.getElementById('node-count');
    const eCountElem = document.getElementById('edge-count');
    if (nCountElem) nCountElem.textContent = this.nodes.length;
    if (eCountElem) eCountElem.textContent = this.links.length;
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Buttons
    const btnReset = document.getElementById('btn-reset-zoom');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.transform = { x: this.width / 2, y: this.height / 2, k: 1 };
        if (window.soundFX) window.soundFX.playClick();
      });
    }

    const btnPhysics = document.getElementById('btn-toggle-physics');
    const statusPill = document.getElementById('physics-status');
    if (btnPhysics) {
      btnPhysics.addEventListener('click', () => {
        this.physicsRunning = !this.physicsRunning;
        btnPhysics.textContent = this.physicsRunning ? '⏸' : '▶';
        if (statusPill) {
          statusPill.textContent = this.physicsRunning ? '● Physics Active' : '○ Physics Paused';
          statusPill.classList.toggle('live', this.physicsRunning);
        }
        if (window.soundFX) window.soundFX.playClick();
      });
    }

    // Graph Live Search Filter
    const searchInput = document.getElementById('graph-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
      });
    }

    // Cluster Chips
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeClusterFilter = chip.dataset.cluster;
        if (window.soundFX) window.soundFX.playClick();
      });
    });

    // Node Inspector Close
    const btnCloseInspect = document.getElementById('btn-close-inspector');
    if (btnCloseInspect) {
      btnCloseInspect.addEventListener('click', () => {
        const card = document.getElementById('node-inspector-card');
        if (card) card.style.display = 'none';
        this.selectedNode = null;
      });
    }
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    return {
      x: (clientX - this.transform.x) / this.transform.k,
      y: (clientY - this.transform.y) / this.transform.k,
      screenX: clientX,
      screenY: clientY
    };
  }

  findNodeAt(pos) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (this.activeClusterFilter !== 'all' && node.cluster !== this.activeClusterFilter) continue;
      
      const dx = node.x - pos.x;
      const dy = node.y - pos.y;
      if (dx * dx + dy * dy < (node.radius + 8) ** 2) {
        return node;
      }
    }
    return null;
  }

  onMouseDown(e) {
    const pos = this.getMousePos(e);
    const node = this.findNodeAt(pos);

    if (node) {
      this.draggedNode = node;
      this.draggedNode.isFixed = true;
      this.selectedNode = node;
      this.showNodeInspector(node);
      if (window.soundFX) window.soundFX.playNodeHum();

      // If clicked node corresponds to a note in vault, switch to it!
      if (node.noteId && window.switchNote) {
        window.switchNote(node.noteId);
      }
    } else {
      this.isDragging = true;
      this.dragStart = { x: e.clientX - this.transform.x, y: e.clientY - this.transform.y };
    }
  }

  showNodeInspector(node) {
    const card = document.getElementById('node-inspector-card');
    const title = document.getElementById('inspect-title');
    const degree = document.getElementById('inspect-degree');
    const cluster = document.getElementById('inspect-cluster');
    const type = document.getElementById('inspect-type');

    if (card && title && degree && cluster && type) {
      card.style.display = 'block';
      title.textContent = node.label;
      degree.textContent = `${node.degree} links`;
      cluster.textContent = node.cluster.toUpperCase();
      type.textContent = node.isCustom ? 'VAULT NOTE NODE' : `${node.cluster.toUpperCase()} ARCHIVE NODE`;
    }
  }

  onMouseMove(e) {
    const pos = this.getMousePos(e);

    if (this.draggedNode) {
      this.draggedNode.x = pos.x;
      this.draggedNode.y = pos.y;
      this.draggedNode.vx = 0;
      this.draggedNode.vy = 0;
    } else if (this.isDragging) {
      this.transform.x = e.clientX - this.dragStart.x;
      this.transform.y = e.clientY - this.dragStart.y;
    } else {
      this.hoveredNode = this.findNodeAt(pos);
    }
  }

  onMouseUp() {
    if (this.draggedNode) {
      this.draggedNode.isFixed = false;
      this.draggedNode = null;
    }
    this.isDragging = false;
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newK = Math.min(Math.max(this.transform.k * zoomFactor, 0.3), 3.5);

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.transform.x = mouseX - (mouseX - this.transform.x) * (newK / this.transform.k);
    this.transform.y = mouseY - (mouseY - this.transform.y) * (newK / this.transform.k);
    this.transform.k = newK;
  }

  updatePhysics() {
    if (!this.physicsRunning) return;

    const repulseStrength = 360;
    const springStrength = 0.045;
    const centerGravity = 0.035;
    const damping = 0.88;

    for (let i = 0; i < this.nodes.length; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n2 = this.nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 100;
        const dist = Math.sqrt(distSq);
        
        const force = repulseStrength / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!n1.isFixed) { n1.vx -= fx; n1.vy -= fy; }
        if (!n2.isFixed) { n2.vx += fx; n2.vy += fy; }
      }
    }

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      const source = this.nodes[link.source];
      const target = this.nodes[link.target];
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - link.length;
      
      const fx = (dx / dist) * displacement * springStrength;
      const fy = (dy / dist) * displacement * springStrength;

      if (!source.isFixed) { source.vx += fx; source.vy += fy; }
      if (!target.isFixed) { target.vx -= fx; target.vy -= fy; }
    }

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.isFixed) continue;

      node.vx -= node.x * centerGravity;
      node.vy -= node.y * centerGravity;

      node.vx *= damping;
      node.vy *= damping;

      node.x += node.vx;
      node.y += node.vy;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.transform.x, this.transform.y);
    this.ctx.scale(this.transform.k, this.transform.k);

    const hasQuery = this.searchQuery.length > 0;
    const filter = this.activeClusterFilter;

    // 1. Draw Links
    this.ctx.lineWidth = 1.0;
    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      const s = this.nodes[link.source];
      const t = this.nodes[link.target];
      if (!s || !t) continue;

      if (filter !== 'all' && (s.cluster !== filter || t.cluster !== filter)) continue;

      const isConnectedToHover = this.hoveredNode && (s.id === this.hoveredNode.id || t.id === this.hoveredNode.id);
      const isConnectedToSelected = this.selectedNode && (s.id === this.selectedNode.id || t.id === this.selectedNode.id);

      this.ctx.beginPath();
      this.ctx.moveTo(s.x, s.y);
      this.ctx.lineTo(t.x, t.y);

      if (isConnectedToHover || isConnectedToSelected) {
        this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
        this.ctx.lineWidth = 2.0;
        this.ctx.stroke();
      } else {
        this.ctx.strokeStyle = 'rgba(34, 211, 238, 0.16)';
        this.ctx.lineWidth = 0.8;
        this.ctx.stroke();
      }
    }

    // 2. Draw Nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const isFilteredCluster = (filter !== 'all' && n.cluster !== filter);
      const isMatchedQuery = !hasQuery || n.label.toLowerCase().includes(this.searchQuery);
      
      const isHovered = this.hoveredNode && this.hoveredNode.id === n.id;
      const isSelected = this.selectedNode && this.selectedNode.id === n.id;

      if (isFilteredCluster) continue;

      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, isHovered || isSelected ? n.radius + 3 : n.radius, 0, Math.PI * 2);

      this.ctx.globalAlpha = isMatchedQuery ? 1.0 : 0.2;

      // Glow effect
      this.ctx.fillStyle = n.color;
      this.ctx.shadowColor = n.color;
      this.ctx.shadowBlur = (isHovered || isSelected || (hasQuery && isMatchedQuery)) ? 20 : 6;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      // White core
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, Math.max(1.5, n.radius * 0.4), 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();

      this.ctx.globalAlpha = 1.0;
    }

    // 3. Draw Hover Tooltip on Node
    if (this.hoveredNode) {
      const n = this.hoveredNode;
      this.ctx.font = '11px "Fira Code", monospace';
      const textWidth = this.ctx.measureText(n.label).width;

      this.ctx.fillStyle = 'rgba(3, 6, 5, 0.92)';
      this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
      this.ctx.lineWidth = 1;
      
      const boxX = n.x + 12;
      const boxY = n.y - 12;
      this.ctx.beginPath();
      this.ctx.roundRect(boxX, boxY, textWidth + 14, 22, 5);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#f8fafc';
      this.ctx.fillText(n.label, boxX + 7, boxY + 15);
    }

    this.ctx.restore();
  }

  animate() {
    this.updatePhysics();
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.graphEngine = new KnowledgeGraphEngine('graph-canvas');
});
