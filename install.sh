#!/bin/sh
pdfjs_ver="2.6.347"
zip="pdfjs-$pdfjs_ver-dist.zip"
url="https://github.com/mozilla/pdf.js/releases/download/v$pdfjs_ver/$zip"
cmd_exist() {
    command -v "$@" >/dev/null 2>&1
}

cat <<'EOF'
     ____  ____  ____  __    ____  ____  ____
    (  _ \(    \(  __)(  )  (  __)/ ___)/ ___)
     ) __/ ) D ( ) _) / (_/\ ) _) \___ \\___ \
    (__)  (____/(__)  \____/(____)(____/(____/

pdfless is a customization plugin for PDF.js web viewer.
It adds a switch for 'Terminal mode' where you can change the colors and font
of (non-scanned) PDF files. Read it as if it's on a terminal screen!

EOF
if ! [ -f web/viewer.html ]; then
    echo "Downloading latest PDF.js prebuilt beta ($pdfjs_ver)..."
    if ! [ -f "$zip" ]; then
        if cmd_exist wget; then
            wget -q --show-progress "$url"
        elif cmd_exist curl; then
            curl -fLO# "$url"
        else
            echo "Download failed! Manually download PDF.js and try again."
            exit 1
        fi
    fi
    printf "Extracting..."
    unzip -q "$zip" || exit
    echo "done."
    rm -f "$zip"
    rm -f web/compressed.tracemonkey-*
fi

grep -q 'pdfless.js' web/viewer.html && echo "Already installed!" && exit
printf "Installing pdfless..."
sed -e 's/\(<\/head>\)/<script src="..\/..\/plugin\/pdfless.js"><\/script>\1/' \
        web/viewer.html > tmp && mv tmp web/viewer.html
printf "done.\n\n"
echo "Installation completed! Run \`./pdfless -h\` for usage info."
echo "To undo this installation, run \`rm -r build web LICENSE\`."
echo "You may move this directory anywhere, preserving its internal structure."
echo "Optionally add it to your PATH or create a symlink to ./pdfless in PATH."
