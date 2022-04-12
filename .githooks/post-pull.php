<?php
node_version('12');
run(
    // Update libraries
    onchange(['package-lock.json', 'src'], 'npm install;npm run build;')
);
