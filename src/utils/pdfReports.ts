import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import type { Route, Student, Payment } from "@/src/data/mockData";
import { getFeeStatus, FEE_COLORS } from "@/src/data/mockData";

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
    return "₹" + n.toLocaleString("en-IN");
}

function today(): string {
    return new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

const BASE_CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #1a1a2e;
        background: #fff;
        padding: 32px;
        font-size: 13px;
    }
    .header {
        text-align: center;
        margin-bottom: 28px;
        padding-bottom: 18px;
        border-bottom: 3px solid #1E3A5F;
    }
    .header h1 {
        font-size: 22px;
        font-weight: 900;
        color: #1E3A5F;
        margin-bottom: 4px;
        letter-spacing: 1px;
    }
    .header .subtitle {
        font-size: 13px;
        color: #666;
        margin-bottom: 2px;
    }
    .header .date {
        font-size: 11px;
        color: #999;
    }
    .meta-row {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 20px;
    }
    .meta-item {
        flex: 1;
        min-width: 120px;
        background: #f5f7fa;
        border-radius: 8px;
        padding: 10px 14px;
        border-left: 3px solid #1E3A5F;
    }
    .meta-item .label {
        font-size: 9px;
        font-weight: 800;
        color: #888;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        margin-bottom: 2px;
    }
    .meta-item .value {
        font-size: 15px;
        font-weight: 700;
        color: #1a1a2e;
    }
    .meta-item.accent-green { border-left-color: #00C853; }
    .meta-item.accent-red { border-left-color: #E53935; }
    .meta-item.accent-gold { border-left-color: #FFB800; }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 12px;
    }
    table th {
        background: #1E3A5F;
        color: #fff;
        padding: 10px 12px;
        text-align: left;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
    }
    table td {
        padding: 9px 12px;
        border-bottom: 1px solid #eee;
        vertical-align: middle;
    }
    table tr:nth-child(even) { background: #f9fafb; }
    table tr:last-child td { border-bottom: none; }
    .badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 700;
    }
    .badge-paid { background: #E8F5E9; color: #2E7D32; }
    .badge-due { background: #FFF8E1; color: #F57F17; }
    .badge-overdue { background: #FFEBEE; color: #C62828; }
    .summary-bar {
        display: flex;
        justify-content: space-around;
        background: #f5f7fa;
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 20px;
        border: 1px solid #e0e0e0;
    }
    .summary-stat {
        text-align: center;
    }
    .summary-stat .num {
        font-size: 22px;
        font-weight: 900;
        color: #1E3A5F;
    }
    .summary-stat .lbl {
        font-size: 9px;
        font-weight: 700;
        color: #888;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-top: 2px;
    }
    .section-title {
        font-size: 11px;
        font-weight: 800;
        color: #888;
        letter-spacing: 2px;
        text-transform: uppercase;
        margin-bottom: 10px;
        margin-top: 20px;
    }
    .route-group-header {
        background: #1E3A5F;
        color: #fff;
        padding: 10px 14px;
        border-radius: 8px 8px 0 0;
        font-size: 14px;
        font-weight: 800;
        margin-top: 16px;
    }
    .route-group-table {
        border: 1px solid #ddd;
        border-top: none;
        border-radius: 0 0 8px 8px;
        overflow: hidden;
        margin-bottom: 16px;
    }
    .route-group-table table { margin-bottom: 0; }
    .grand-total {
        text-align: right;
        font-size: 18px;
        font-weight: 900;
        color: #1E3A5F;
        padding: 16px 0;
        border-top: 3px solid #1E3A5F;
        margin-top: 12px;
    }
    .footer {
        margin-top: 32px;
        text-align: center;
        font-size: 10px;
        color: #bbb;
        border-top: 1px solid #eee;
        padding-top: 14px;
    }
`;

// ─── Route Report PDF ─────────────────────────────────────────────────────────

export function buildRouteReportHTML(
    route: Route,
    routeStudents: Student[],
    payments: Payment[]
): string {
    const paidCount = routeStudents.filter(
        (s) => getFeeStatus(s.days_remaining ?? -999) === "paid"
    ).length;
    const dueCount = routeStudents.filter(
        (s) => getFeeStatus(s.days_remaining ?? -999) === "due"
    ).length;
    const overdueCount = routeStudents.filter(
        (s) => getFeeStatus(s.days_remaining ?? -999) === "overdue"
    ).length;
    const totalExpected = routeStudents.reduce(
        (sum, s) => sum + (s.monthly_fee ?? 0),
        0
    );
    const totalCollected = routeStudents
        .filter((s) => getFeeStatus(s.days_remaining ?? -999) === "paid")
        .reduce((sum, s) => sum + (s.monthly_fee ?? 0), 0);

    const studentRows = routeStudents
        .map((s) => {
            const status = getFeeStatus(s.days_remaining ?? -999);
            const badgeClass =
                status === "paid"
                    ? "badge-paid"
                    : status === "due"
                    ? "badge-due"
                    : "badge-overdue";
            const badgeLabel = FEE_COLORS[status].label;
            return `
            <tr>
                <td style="font-weight:700">${s.name}</td>
                <td>${s.class}${s.section ? " – " + s.section : ""}</td>
                <td>${s.boarding_stop ?? "—"}</td>
                <td style="font-weight:700">${formatCurrency(s.monthly_fee)}</td>
                <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
            </tr>`;
        })
        .join("\n");

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
        <div class="header">
            <h1>🚌 Route Report</h1>
            <div class="subtitle">${route.route_name}</div>
            <div class="date">Generated on ${today()}</div>
        </div>

        <div class="meta-row">
            <div class="meta-item">
                <div class="label">Bus Number</div>
                <div class="value">${route.bus?.bus_number ?? "Unassigned"}</div>
            </div>
            <div class="meta-item">
                <div class="label">Driver</div>
                <div class="value">${route.bus?.driver?.name ?? "—"}</div>
            </div>
            <div class="meta-item">
                <div class="label">Route</div>
                <div class="value">${route.start_point} → ${route.end_point}</div>
            </div>
            <div class="meta-item">
                <div class="label">Stops</div>
                <div class="value">${(route.stops ?? []).length}</div>
            </div>
        </div>

        <div class="summary-bar">
            <div class="summary-stat">
                <div class="num">${routeStudents.length}</div>
                <div class="lbl">Total Students</div>
            </div>
            <div class="summary-stat">
                <div class="num" style="color:#2E7D32">${paidCount}</div>
                <div class="lbl">Paid</div>
            </div>
            <div class="summary-stat">
                <div class="num" style="color:#F57F17">${dueCount}</div>
                <div class="lbl">Due Soon</div>
            </div>
            <div class="summary-stat">
                <div class="num" style="color:#C62828">${overdueCount}</div>
                <div class="lbl">Overdue</div>
            </div>
            <div class="summary-stat">
                <div class="num" style="color:#2E7D32">${formatCurrency(totalCollected)}</div>
                <div class="lbl">Collected</div>
            </div>
            <div class="summary-stat">
                <div class="num">${formatCurrency(totalExpected)}</div>
                <div class="lbl">Expected</div>
            </div>
        </div>

        <div class="section-title">ENROLLED STUDENTS</div>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Boarding Stop</th>
                    <th>Fee</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${studentRows || '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">No students enrolled on this route.</td></tr>'}
            </tbody>
        </table>

        <div class="footer">
            Bus Management System — Route Report — ${route.route_name}
        </div>
    </body></html>`;
}

// ─── Monthly Payment Report PDF ───────────────────────────────────────────────

export function buildMonthlyPaymentReportHTML(
    month: string,
    monthPayments: Payment[],
    students: Student[],
    routes: Route[]
): string {
    const grandTotal = monthPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    // Group payments by route
    type RouteGroup = { route: Route | undefined; routeName: string; payments: (Payment & { student?: Student })[] };
    const groupMap = new Map<string, RouteGroup>();

    monthPayments.forEach((p) => {
        const student = students.find((s) => s.id === p.student_id);
        const routeId = student?.route_id ?? "unassigned";
        const route = routes.find((r) => r.id === routeId);
        const routeName = route?.route_name ?? "Unassigned Route";

        if (!groupMap.has(routeId)) {
            groupMap.set(routeId, { route, routeName, payments: [] });
        }
        groupMap.get(routeId)!.payments.push({ ...p, student });
    });

    const groups = Array.from(groupMap.values());

    const groupsHTML = groups
        .map((g) => {
            const subtotal = g.payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
            const rows = g.payments
                .map(
                    (p) => `
                <tr>
                    <td style="font-weight:700">${p.student?.name ?? "Unknown"}</td>
                    <td>${p.student?.class ?? "—"}${p.student?.section ? " – " + p.student.section : ""}</td>
                    <td>${p.student?.boarding_stop ?? "—"}</td>
                    <td style="font-weight:700">${formatCurrency(p.amount)}</td>
                    <td>${p.payment_mode}</td>
                    <td>${new Date(p.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td style="font-size:11px;color:#888">${p.notes ?? "—"}</td>
                </tr>`
                )
                .join("\n");

            return `
            <div class="route-group-header">${g.routeName}${g.route?.bus ? " — Bus " + g.route.bus.bus_number : ""} <span style="float:right;font-size:13px">${formatCurrency(subtotal)}</span></div>
            <div class="route-group-table">
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Class</th>
                            <th>Stop</th>
                            <th>Amount</th>
                            <th>Mode</th>
                            <th>Date</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        })
        .join("\n");

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
        <div class="header">
            <h1>💰 Monthly Payment Report</h1>
            <div class="subtitle">${month}</div>
            <div class="date">Generated on ${today()}</div>
        </div>

        <div class="summary-bar">
            <div class="summary-stat">
                <div class="num">${monthPayments.length}</div>
                <div class="lbl">Payments</div>
            </div>
            <div class="summary-stat">
                <div class="num" style="color:#2E7D32">${formatCurrency(grandTotal)}</div>
                <div class="lbl">Total Collected</div>
            </div>
            <div class="summary-stat">
                <div class="num">${groups.length}</div>
                <div class="lbl">Routes</div>
            </div>
        </div>

        ${groupsHTML || '<p style="text-align:center;color:#999;padding:40px 0">No payments recorded for this month.</p>'}

        <div class="grand-total">Grand Total: ${formatCurrency(grandTotal)}</div>

        <div class="footer">
            Bus Management System — Monthly Payment Report — ${month}
        </div>
    </body></html>`;
}

// ─── Print & Share Utility ────────────────────────────────────────────────────

export async function printAndSharePDF(html: string, fileName: string): Promise<void> {
    try {
        const { uri } = await Print.printToFileAsync({
            html,
            base64: false,
        });

        if (Platform.OS === "web") {
            // On web, open print dialog directly
            await Print.printAsync({ html });
            return;
        }

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
            await Sharing.shareAsync(uri, {
                mimeType: "application/pdf",
                dialogTitle: fileName,
                UTI: "com.adobe.pdf",
            });
        } else {
            Alert.alert("PDF Generated", `PDF saved to:\n${uri}`);
        }
    } catch (error: any) {
        Alert.alert("Export Error", error.message ?? "Failed to generate PDF.");
    }
}
