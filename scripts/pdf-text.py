"""
把 PDF 转成纯文本，供 JobFit 后端调用。

为什么用 Python：中文字体要处理 CID 编码和 ToUnicode 映射，纯 JS 实现会很脆；
本机的 PyMuPDF 已经能稳定提取（它自带 CMap 处理）。找不到 Python 时后端会退回粘贴文本。
"""

import json
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "缺少文件路径"}, ensure_ascii=False))
        return 2

    path = sys.argv[1]

    try:
        import pymupdf  # type: ignore
    except ImportError:
        try:
            import fitz as pymupdf  # type: ignore
        except ImportError:
            print(json.dumps({"error": "未安装 PyMuPDF"}, ensure_ascii=False))
            return 3

    try:
        doc = pymupdf.open(path)
        pages = []
        for page in doc:
            pages.append(page.get_text("text", sort=True))
        text = "\n".join(pages).strip()
        print(
            json.dumps(
                {
                    "text": text,
                    "pages": doc.page_count,
                    "chars": len(text),
                },
                ensure_ascii=False,
            )
        )
        return 0
    except Exception as exc:  # noqa: BLE001 - 需要把任何异常都变成结构化输出
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main())
