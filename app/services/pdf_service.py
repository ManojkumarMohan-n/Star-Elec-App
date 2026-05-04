"""
PDF Service - Generate printable invoices using ReportLab
"""

import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT


def generate_invoice_pdf(bill) -> str:
    """
    Generate a professional invoice PDF for the given bill.
    Returns the path to the generated PDF file.
    """
    os.makedirs("uploads/invoices", exist_ok=True)
    pdf_path = f"uploads/invoices/{bill.invoice_number}.pdf"

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )

    styles = getSampleStyleSheet()
    elements = []

    # ── Header ───────────────────────────────────────────────────────────────
    header_style = ParagraphStyle("Header", fontSize=22, fontName="Helvetica-Bold",
                                  textColor=colors.HexColor("#1e3a5f"), spaceAfter=2)
    sub_style    = ParagraphStyle("Sub", fontSize=10, textColor=colors.grey, spaceAfter=2)
    normal       = ParagraphStyle("Normal", fontSize=9, spaceAfter=2)
    bold_right   = ParagraphStyle("BoldRight", fontSize=10, fontName="Helvetica-Bold",
                                  alignment=TA_RIGHT)

    elements.append(Paragraph("⚡ ELECTRICAL SHOP", header_style))
    elements.append(Paragraph("Professional Electrical Solutions", sub_style))
    elements.append(Paragraph("123 Main Road, Chennai, Tamil Nadu - 600001", normal))
    elements.append(Paragraph("Phone: +91 98765 43210 | GST: 33AAAAA0000A1Z5", normal))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1e3a5f")))
    elements.append(Spacer(1, 5*mm))

    # ── Invoice Info ─────────────────────────────────────────────────────────
    customer_name = (
        bill.customer.name if bill.customer else (bill.customer_name or "Walk-in Customer")
    )
    info_data = [
        [Paragraph(f"<b>INVOICE</b>", ParagraphStyle("", fontSize=16, fontName="Helvetica-Bold",
                   textColor=colors.HexColor("#1e3a5f"))),
         Paragraph(f"<b>Invoice No:</b> {bill.invoice_number}", bold_right)],
        [Paragraph(f"Bill To: <b>{customer_name}</b>", normal),
         Paragraph(f"Date: {bill.created_at.strftime('%d %b %Y, %H:%M')}", ParagraphStyle("", fontSize=9, alignment=TA_RIGHT))],
        [Paragraph(f"Payment: {bill.payment_method.upper()}", normal),
         Paragraph(f"Status: {bill.status.upper()}", ParagraphStyle("", fontSize=9, alignment=TA_RIGHT,
                   textColor=colors.green if bill.status == "completed" else colors.red))],
    ]
    info_table = Table(info_data, colWidths=["60%", "40%"])
    info_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(info_table)
    elements.append(Spacer(1, 5*mm))

    # ── Items Table ──────────────────────────────────────────────────────────
    header_row = ["#", "Product", "SKU", "Qty", "Unit Price", "Disc%", "GST%", "Total"]
    rows = [header_row]
    for i, item in enumerate(bill.items, 1):
        rows.append([
            str(i),
            item.product_name,
            item.sku,
            str(item.quantity),
            f"₹{item.unit_price:,.2f}",
            f"{item.discount_pct}%",
            f"{item.gst_rate}%",
            f"₹{item.total_price:,.2f}",
        ])

    col_widths = [8*mm, 55*mm, 25*mm, 12*mm, 22*mm, 14*mm, 14*mm, 24*mm]
    item_table = Table(rows, colWidths=col_widths, repeatRows=1)
    item_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0),  colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("ALIGN",       (0, 0), (-1, -1), "CENTER"),
        ("ALIGN",       (1, 1), (1, -1),  "LEFT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
    ]))
    elements.append(item_table)
    elements.append(Spacer(1, 5*mm))

    # ── Totals ───────────────────────────────────────────────────────────────
    totals_data = [
        ["Subtotal:",         f"₹{bill.subtotal:,.2f}"],
        ["Discount:",         f"-₹{bill.discount_amount:,.2f}"],
        ["CGST:",             f"₹{bill.cgst_amount:,.2f}"],
        ["SGST:",             f"₹{bill.sgst_amount:,.2f}"],
        ["Total Tax:",        f"₹{bill.total_tax:,.2f}"],
        ["GRAND TOTAL:",      f"₹{bill.grand_total:,.2f}"],
        ["Amount Paid:",      f"₹{bill.amount_paid:,.2f}"],
    ]
    t_style = ParagraphStyle("TR", fontSize=9, alignment=TA_RIGHT)
    totals_table = Table(
        [[Paragraph(r[0], t_style), Paragraph(r[1], ParagraphStyle("TV", fontSize=9, fontName="Helvetica-Bold" if r[0] in ["GRAND TOTAL:", "Amount Paid:"] else "Helvetica", alignment=TA_RIGHT))] for r in totals_data],
        colWidths=["75%", "25%"]
    )
    totals_table.setStyle(TableStyle([
        ("LINEABOVE", (0, 5), (-1, 5), 1.5, colors.HexColor("#1e3a5f")),
        ("BACKGROUND", (0, 5), (-1, 5), colors.HexColor("#e8f0fe")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(totals_table)

    # ── Footer ───────────────────────────────────────────────────────────────
    elements.append(Spacer(1, 10*mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
    elements.append(Paragraph(
        "Thank you for your business! | This is a computer-generated invoice.",
        ParagraphStyle("Footer", fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    ))

    doc.build(elements)
    return pdf_path
