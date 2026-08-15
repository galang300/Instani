from bs4 import BeautifulSoup


def parse_price_table(html: str):
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for tr in soup.select("tr"):
        cells = [cell.get_text(strip=True) for cell in tr.select("td")]
        if len(cells) >= 2:
            rows.append({"commodity": cells[0], "rawPrice": cells[1]})
    return rows
