const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
  `          // Keep active theater state up-to-date with server-side roster changes
          if (currentTheater) {
            const updated = data.find((r: Room) => r.id === currentTheater.id);
            if (updated) {
              setCurrentTheater(updated);
            }
          }`,
  `          // Update current theater if we are in one, using functional update to avoid dependency
          setCurrentTheater(prev => {
            if (prev) {
              const updated = data.find((r: Room) => r.id === prev.id);
              if (updated && JSON.stringify(updated) !== JSON.stringify(prev)) {
                return updated;
              }
            }
            return prev;
          });`
);

app = app.replace("  }, [currentTheater]);", "  }, []);");

fs.writeFileSync('src/App.tsx', app);
