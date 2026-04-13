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
    ['role: decoded.role', 'role: decoded.role as any']
]);

replaceFile('src/lib/auth.ts', [
    ['const salt = new Uint8Array(Buffer.from(saltHex, \'hex\'));', 'const salt = new Uint8Array(Buffer.from(saltHex, \'hex\').buffer, Buffer.from(saltHex, \'hex\').byteOffset, Buffer.from(saltHex, \'hex\').byteLength);'],
    ['const salt = Buffer.from(saltHex, \'hex\');', 'const salt = new Uint8Array(Buffer.from(saltHex, \'hex\').buffer, Buffer.from(saltHex, \'hex\').byteOffset, Buffer.from(saltHex, \'hex\').byteLength);']
]);

replaceFile('src/components/ui/DataTable.tsx', [
    ['<Skeleton cols={', '<Skeleton /> {/* ']
]);

replaceFile('src/components/views/ClientsView.tsx', [
    ['variant="secondary"\n        onConfirm={handleDeleteClient}', 'variant="danger"\n        onConfirm={handleDeleteClient}']
]);

replaceFile('src/components/views/FinancialReportsView.tsx', [
    ['downloadCSV(', '// downloadCSV(']
]);

replaceFile('src/components/views/InvoicePreview.tsx', [
    ['const imgProps = pdf.getImageProperties(imgData)', 'const imgProps = (pdf as any).getImageProperties(imgData)'],
    ['variant="secondary"\n        onConfirm={async () => {', 'variant="danger"\n        onConfirm={async () => {']
]);

console.log("Fixes applied");
