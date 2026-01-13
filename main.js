import * as d3 from 'd3';
import './style.css';

// Map frequencies to icon paths
const freqIcons = {
  "Online": "./icons/online.png",
  "T menos 15 min": "./icons/t-15min.png",
  "T menos un día": "./icons/t-1.png",
  "Último mes": "./icons/last-month.png"
};

const appContainer = document.getElementById('app');
let width = appContainer.clientWidth;
let height = appContainer.clientHeight;

// Toggle Button Construction
const toggleBtn = document.createElement("button");
toggleBtn.id = "sidebar-toggle";
toggleBtn.innerHTML = "☰"; // Hamburger icon
document.body.appendChild(toggleBtn); // Append to body to sit on top

const controlsPanel = document.getElementById("controls");

// Toggle Logic
function toggleSidebar() {
  controlsPanel.classList.toggle("collapsed");
  // Allow CSS transition to happen, then resize graph
  setTimeout(() => {
    resizeGraph();
  }, 310); // slightly longer than CSS transition
}

toggleBtn.addEventListener("click", toggleSidebar);

// Keyboard Shortcut ('F' or 'M')
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'm') {
    toggleSidebar();
  }
});

// Resize Observer for responsive graph
const resizeObserver = new ResizeObserver(entries => {
  resizeGraph();
});
resizeObserver.observe(appContainer);


const tooltip = d3.select("#app")
  .append("div")
  .attr("class", "tooltip");

const svg = d3.select("#app")
  .append("svg")
  .attr("viewBox", [0, 0, width, height])
  .call(d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
      gMain.attr("transform", event.transform);
    }));

// Main group for Zoom/Pan
const gMain = svg.append("g");

// Arrow Marker Definition
svg.append("defs").selectAll("marker")
  .data(["end"])
  .enter().append("marker")
  .attr("id", "arrow")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 30) // Position of arrow relative to node radius
  .attr("refY", 0)
  .attr("markerWidth", 6)
  .attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("fill", "#666");

// Swimlane setup
const laneHeight = height / 3;
const lanes = [
  { id: "High", y: laneHeight * 0.5, label: "Portales y Canales" },
  { id: "Mid", y: laneHeight * 1.5, label: "Almacenamiento Intermedio" },
  { id: "Low", y: laneHeight * 2.5, label: "Orígenes" }
];

// Draw swimlane dividers and labels
const laneGroup = gMain.append("g").attr("class", "lanes");

let swimLines = laneGroup.selectAll("line")
  .data([laneHeight, laneHeight * 2])
  .enter()
  .append("line")
  .attr("x1", -width * 2) // Extend lines for zooming panning
  .attr("x2", width * 4) // Make them very long to cover zoom/pan
  .attr("y1", d => d)
  .attr("y2", d => d)
  .attr("stroke", "#3f3f4fff")
  .attr("stroke-width", 5)
  .attr("stroke-dasharray", "10,5");

laneGroup.selectAll("text")
  .data(lanes)
  .enter()
  .append("text")
  .attr("x", 20)
  .attr("y", d => d.y)
  .attr("fill", "rgba(255, 255, 255, 0.2)")
  .attr("font-size", "22px")
  .attr("font-weight", "bold")
  .attr("dy", ".35em")
  .style("pointer-events", "none")
  .style("text-transform", "uppercase")
  .text(d => d.label);

// Simulation setup
const simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).distance(120))
  .force("charge", d3.forceManyBody().strength(-800))
  .force("x", d3.forceX((width / 2) + 80).strength(0.02))
  .force("y", d3.forceY(d => {
    // Default to Mid if tier is missing or unknown
    if (d.tier === 'High') return laneHeight * 0.5;
    if (d.tier === 'Low') return laneHeight * 2.5;
    return laneHeight * 1.5; // Mid
  }).strength(0.3))
  .force("collide", d3.forceCollide().radius(45));

// Linked logic for resizing
function resizeGraph() {
  width = appContainer.clientWidth;
  height = appContainer.clientHeight;

  // Update SVG
  svg.attr("viewBox", [0, 0, width, height]);

  // Update Simulation Centers
  simulation.force("x", d3.forceX((width / 2) + 80).strength(0.02));

  // Wake up simulation to adjust to new center
  simulation.alpha(0.3).restart();
}

// Create a group for link labels ensuring they are above links but below nodes
// Appended to gMain instead of svg
let link = gMain.append("g").attr("class", "links").selectAll(".link");
let linkLabel = gMain.append("g").attr("class", "link-labels").selectAll(".link-label");
let node = gMain.append("g").attr("class", "nodes").selectAll("g");
const color = d3.scaleOrdinal(d3.schemeCategory10);

const loadData = async () => {
  try {
    const [nodesText, linksText] = await Promise.all([
      d3.text("./nodos.json"),
      d3.text("./arcos.json")
    ]);

    // The files contain comma-separated objects but are missing the enclosing brackets
    // We wrap them manually to parse as JSON arrays
    const allNodes = JSON.parse(`[${nodesText}]`);
    const allLinks = JSON.parse(`[${linksText}]`);

    return { nodes: allNodes, links: allLinks };
  } catch (error) {
    console.error("Error loading data:", error);
    return { nodes: [], links: [] };
  }
};

loadData().then(data => {
  const allNodes = data.nodes;
  const allLinks = data.links;

  // Pre-process links to ensure source/target are objects
  // This avoids D3 having to look them up by ID during the simulation start
  // and makes our filtering logic consistent (always objects)
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  allLinks.forEach(l => {
    if (typeof l.source !== 'object') l.source = nodeMap.get(l.source);
    if (typeof l.target !== 'object') l.target = nodeMap.get(l.target);
  });

  // Filter out links where source or target is missing (invalid ID)
  const validLinks = allLinks.filter(l => l.source && l.target);

  // Pre-calculate jitter for links to be deterministic per link but random across links
  // This prevents the lines from "vibrating" on every tick
  validLinks.forEach(d => {
    d.jitter = (Math.random() - 0.5) * 40; // +/- 20px deviation
  });

  // Extract unique countries
  const countries = [...new Set(allNodes.map(d => d.country))].sort();

  // Track selected countries (initially all)
  const selectedCountries = new Set(countries);

  // Create UI Controls
  const controls = d3.select("#controls");

  // Add Title
  controls.append("h3")
    .text("Filtro por país")
    .style("color", "#fff")
    .style("margin-bottom", "10px")
    .style("font-size", "14px")
    .style("text-transform", "uppercase");

  const container = controls.append("div");

  container.selectAll("label")
    .data(countries)
    .enter()
    .append("label")
    .style("display", "block")
    .style("margin", "5px 0")
    .style("cursor", "pointer")
    .html(d => `<input type="checkbox" value="${d}" checked> ${d}`)
    .on("change", (event, d) => {
      if (event.target.checked) {
        selectedCountries.add(d);
      } else {
        selectedCountries.delete(d);
      }
      filterGraph();
    });

  // Initial render
  update(allNodes, validLinks);

  function filterGraph() {
    const filteredNodes = allNodes.filter(d => selectedCountries.has(d.country));
    const filteredNodesSet = new Set(filteredNodes);

    // Links are already resolved to objects, so we can check membership directly
    const filteredLinks = validLinks.filter(l =>
      filteredNodesSet.has(l.source) && filteredNodesSet.has(l.target)
    );
    update(filteredNodes, filteredLinks);
  }

  function update(nodes, links) {
    // Links
    link = link
      .data(links, d => d.source.id + "-" + d.target.id)
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("marker-end", "url(#arrow)")
      .attr("stroke-dasharray", d => d.type === "Manual" ? "4" : null);

    // Link Labels (Now Images)
    linkLabel = linkLabel
      .data(links, d => d.source.id + "-" + d.target.id)
      .join("image")
      .attr("class", "link-label")
      .attr("href", d => freqIcons[d.frequency] || "")
      .attr("width", 16)
      .attr("height", 16);

    // Nodes
    node = node
      .data(nodes, d => d.id)
      .join(
        enter => {
          const g = enter.append("g")
            .attr("class", "node")
            .call(d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));

          g.append("circle")
            .attr("r", 5)
            .attr("fill", d => color(d.country));

          g.append("text")
            .attr("dy", 30)
            .attr("text-anchor", "middle")
            .text(d => d.application);

          let hoverTimeout; // Store timeout ID

          g.on("mouseover", (event, d) => {
            // Tooltip
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
              <h3>${d.application}</h3>
              <p><strong>Country:</strong> ${d.country}</p>
              <p><strong>Responsible:</strong> ${d.responsible}</p>
              <p><strong>Business Unit:</strong> ${d.businessUnit && d.businessUnit.length > 0 ? d.businessUnit.join(", ") : "None"}</p>
              <p><strong>Tier:</strong> ${d.tier}</p>
            `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");

            // DELAYED HIGHLIGHTING (0.5s)
            hoverTimeout = setTimeout(() => {
              // Highlight connected links
              link.transition().duration(200).style("stroke-opacity", l => (l.source === d || l.target === d) ? 1 : 0.05); // Dimmed to 0.05
              link.style("stroke-width", l => (l.source === d || l.target === d) ? 2.5 : 1);

              // Highlight connected labels
              linkLabel.transition().duration(200).style("opacity", l => (l.source === d || l.target === d) ? 1 : 0.05);

              // Highlight connected nodes
              node.transition().duration(200).style("opacity", n => {
                const isConnected = links.some(l => (l.source === d && l.target === n) || (l.target === d && l.source === n));
                return (n === d || isConnected) ? 1 : 0.2;
              });
            }, 500); // 500ms delay logic
          })
            .on("mouseout", () => {
              clearTimeout(hoverTimeout); // Cancel hover effect if mouse leaves

              // Hide tooltip
              tooltip.transition().duration(500).style("opacity", 0);

              // Reset styles
              link.transition().duration(200).style("stroke-opacity", 0.6).style("stroke-width", 1.5);
              linkLabel.transition().duration(200).style("opacity", 1);
              node.transition().duration(200).style("opacity", 1);
            });

          return g;
        },
        update => update,
        exit => exit.remove()
      );

    // Restart simulation
    simulation.nodes(nodes).on("tick", ticked);
    simulation.force("link").links(links);
    // Re-heat the simulation significantly to allow nodes to find their Y positions
    simulation.alpha(1).restart();
  }

  function ticked() {
    // Bounding Box Constraint
    // Radius is ~20px, so we keep center within [25, width-25]
    node.attr("transform", d => {
      d.x = Math.max(25, Math.min(width - 25, d.x));
      d.y = Math.max(25, Math.min(height - 25, d.y));
      return `translate(${d.x},${d.y})`;
    });

    // Midpoint Orthogonal routing: Horizontal -> Vertical -> Horizontal
    // Avoids overlapping on node axes + Jitter
    link.attr("d", d => {
      // Use the pre-calculated jitter so lines don't vibrate
      // If jitter is missing (e.g. data update), default to 0
      const jitter = d.jitter || 0;
      const midX = ((d.source.x + d.target.x) / 2) + jitter;

      return `M ${d.source.x} ${d.source.y} L ${midX} ${d.source.y} L ${midX} ${d.target.y} L ${d.target.x} ${d.target.y}`;
    });

    // Link Labels - Position at vertical midpoint
    // Centered: x - width/2, y - height/2
    linkLabel
      .attr("x", d => (((d.source.x + d.target.x) / 2) + (d.jitter || 0)) - 8)
      .attr("y", d => ((d.source.y + d.target.y) / 2) - 8);
  }

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
});
