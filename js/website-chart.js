// Website trend chart rendering (bar charts, line charts, pie charts)

const WebsiteChart = {
  // Render a weekly bar chart for a domain
  renderWeeklyBarChart(container, trendData) {
    const width = 280;
    const height = 120;
    const padding = { top: 10, right: 10, bottom: 25, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxSeconds = Math.max(...trendData.map(d => d.seconds), 1);
    const barWidth = chartWidth / 7 - 4;

    let svg = `<svg class="weekly-bar-chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    // Draw bars
    trendData.forEach((d, i) => {
      const barHeight = (d.seconds / maxSeconds) * chartHeight;
      const x = padding.left + i * (chartWidth / 7) + 2;
      const y = padding.top + chartHeight - barHeight;

      // Bar
      svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}"
                    fill="#4a9eff" rx="2" class="bar" data-date="${d.date}"/>`;

      // Day label
      svg += `<text x="${x + barWidth / 2}" y="${height - 5}"
                    fill="#888" font-size="10" text-anchor="middle">${d.dayLabel}</text>`;

      // Time label on hover area (show if has time)
      if (d.seconds > 0) {
        const timeLabel = Websites.formatTime(d.seconds);
        svg += `<text x="${x + barWidth / 2}" y="${y - 4}"
                      fill="#aaa" font-size="9" text-anchor="middle" class="bar-label">${timeLabel}</text>`;
      }
    });

    svg += '</svg>';
    container.innerHTML = svg;
  },

  // Render a monthly line chart for a domain
  renderMonthlyLineChart(container, trendData) {
    const width = 280;
    const height = 120;
    const padding = { top: 15, right: 10, bottom: 25, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxSeconds = Math.max(...trendData.map(d => d.seconds), 1);
    const pointSpacing = chartWidth / (trendData.length - 1);

    let svg = `<svg class="monthly-line-chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    // Draw area fill
    let areaPath = `M ${padding.left} ${padding.top + chartHeight}`;
    trendData.forEach((d, i) => {
      const x = padding.left + i * pointSpacing;
      const y = padding.top + chartHeight - (d.seconds / maxSeconds) * chartHeight;
      areaPath += ` L ${x} ${y}`;
    });
    areaPath += ` L ${padding.left + chartWidth} ${padding.top + chartHeight} Z`;
    svg += `<path d="${areaPath}" fill="rgba(74, 158, 255, 0.2)"/>`;

    // Draw line
    let linePath = '';
    trendData.forEach((d, i) => {
      const x = padding.left + i * pointSpacing;
      const y = padding.top + chartHeight - (d.seconds / maxSeconds) * chartHeight;
      linePath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    svg += `<path d="${linePath}" fill="none" stroke="#4a9eff" stroke-width="2"/>`;

    // Draw points for key dates
    trendData.forEach((d, i) => {
      if (i % 7 === 0 || i === trendData.length - 1) {
        const x = padding.left + i * pointSpacing;
        const y = padding.top + chartHeight - (d.seconds / maxSeconds) * chartHeight;
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="#4a9eff"/>`;

        // Day number label
        svg += `<text x="${x}" y="${height - 5}"
                      fill="#888" font-size="9" text-anchor="middle">${d.dayNum}</text>`;
      }
    });

    svg += '</svg>';
    container.innerHTML = svg;
  },

  // Render a category pie chart
  renderCategoryPieChart(container, categoryTotals) {
    const size = 160;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 60;
    const innerRadius = 35;

    const total = categoryTotals.reduce((sum, c) => sum + c.totalSeconds, 0);
    if (total === 0) {
      container.innerHTML = '<div class="no-data">No data</div>';
      return;
    }

    let svg = `<svg class="category-pie-chart" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

    let currentAngle = -90; // Start from top

    categoryTotals.forEach((cat) => {
      const percentage = cat.totalSeconds / total;
      const angle = percentage * 360;

      // Calculate arc path
      const startAngle = (currentAngle * Math.PI) / 180;
      const endAngle = ((currentAngle + angle) * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const ix1 = centerX + innerRadius * Math.cos(startAngle);
      const iy1 = centerY + innerRadius * Math.sin(startAngle);
      const ix2 = centerX + innerRadius * Math.cos(endAngle);
      const iy2 = centerY + innerRadius * Math.sin(endAngle);

      const largeArc = angle > 180 ? 1 : 0;

      const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`;

      svg += `<path d="${path}" fill="${cat.category.color}" class="pie-segment" data-category="${cat.category.id}"/>`;

      currentAngle += angle;
    });

    // Center text with total time
    svg += `<text x="${centerX}" y="${centerY - 5}" fill="#fff" font-size="14" font-weight="600" text-anchor="middle">${Websites.formatTime(total)}</text>`;
    svg += `<text x="${centerX}" y="${centerY + 12}" fill="#888" font-size="10" text-anchor="middle">total</text>`;

    svg += '</svg>';

    // Add legend
    let legend = '<div class="pie-legend">';
    categoryTotals.forEach(cat => {
      const percentage = Math.round((cat.totalSeconds / total) * 100);
      legend += `
        <div class="legend-item">
          <span class="legend-color" style="background: ${cat.category.color}"></span>
          <span class="legend-name">${cat.category.name}</span>
          <span class="legend-value">${percentage}%</span>
        </div>
      `;
    });
    legend += '</div>';

    container.innerHTML = svg + legend;
  },

  // Render a mini sparkline for quick trend view
  renderSparkline(container, trendData) {
    const width = 80;
    const height = 24;
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxSeconds = Math.max(...trendData.map(d => d.seconds), 1);
    const pointSpacing = chartWidth / (trendData.length - 1);

    let svg = `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    // Draw line
    let linePath = '';
    trendData.forEach((d, i) => {
      const x = padding + i * pointSpacing;
      const y = padding + chartHeight - (d.seconds / maxSeconds) * chartHeight;
      linePath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    svg += `<path d="${linePath}" fill="none" stroke="#4a9eff" stroke-width="1.5"/>`;

    // End point
    const lastPoint = trendData[trendData.length - 1];
    const lastX = padding + (trendData.length - 1) * pointSpacing;
    const lastY = padding + chartHeight - (lastPoint.seconds / maxSeconds) * chartHeight;
    svg += `<circle cx="${lastX}" cy="${lastY}" r="2" fill="#4a9eff"/>`;

    svg += '</svg>';
    container.innerHTML = svg;
  }
};
