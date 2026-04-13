const fs = require('fs');

function replaceFile(path, replacements) {
    if(!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    for(const [from, to] of replacements) {
        content = content.split(from).join(to);
    }
    fs.writeFileSync(path, content);
}

replaceFile('src/app/api/auth/me/route.ts', [
    ['where: { role: session.role }', 'where: { role: session.role as any }']
]);

replaceFile('src/lib/auth.ts', [
    ['{ name: \'PBKDF2\', salt, iterations: 100_000, hash: \'SHA-256\' }', '{ name: \'PBKDF2\', salt: salt as any, iterations: 100_000, hash: \'SHA-256\' }']
]);

replaceFile('src/components/ui/DataTable.tsx', [
    ['<SkeletonTable cols={columns.length + (renderRowActions ? 1 : 0)} rows={5} />', '<SkeletonTable rows={5} />']
]);

replaceFile('src/components/views/ClientsView.tsx', [
    ['confirmLabel="Archive"\n        variant="secondary"\n        onConfirm={handleDeleteClient}', 'confirmLabel="Archive"\n        variant="danger"\n        onConfirm={handleDeleteClient}']
]);

replaceFile('src/components/views/InvoicePreview.tsx', [
    ['confirmLabel="Void Invoice"\n        variant="secondary"\n        onConfirm={async () => {', 'confirmLabel="Void Invoice"\n        variant="danger"\n        onConfirm={async () => {']
]);

console.log("Fixes applied");
