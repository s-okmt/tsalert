// ==UserScript==
// @name         Timesheet alert
// @namespace    https://github.com/s-okmt/tsalert
// @version      0.5.0
// @description  Inform inconsistency of TOYO timesheet before submission
// @author       S. Okamoto
// @match        http://*.corp.toyo-eng.com/pls/QE_10_DAD/qe_proc_qe*
// @match        http://*.corp.toyo-eng.com/pls/QE_10_DAD/qe_pack_qe*
// @match        https://toyo.mind-mobile.jp/pls/QE_10_DAD/,DanaInfo=fms010n.corp.toyo-eng.com+qe_proc_qe*
// @match        https://toyo.mind-mobile.jp/pls/QE_10_DAD/,DanaInfo=fms010n.corp.toyo-eng.com+qe_pack_qe*
// @grant        none
// ==/UserScript==
// a function that loads jQuery and calls a callback function when jQuery has finished loading
function addJQuery(callback) {
  var script = document.createElement("script");
  script.setAttribute(
    "src",
    "https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"
  );
  script.addEventListener(
    "load",
    function() {
      var script = document.createElement("script");
      script.textContent = "(" + callback.toString() + ")();";
      document.body.appendChild(script);
    },
    false
  );
  document.body.appendChild(script);
}

// the guts of this userscript
function main() {
  console.log("start function");
  console.log($("[name=drp_ft]").val());
  $("select[name^=drp_st]").each(function(_i, elem) {
    $(elem)
      .parents("tr")
      .append(
        '<button type="button" id="sb_' +
          $(elem)
            .attr("name")
            .substr(-2) +
          '">Set balance</button>'
      );
  });
  const sum_st_selector =
    "body > div > div > div > div > div > div > table > tbody > tr:eq(1) > td:eq(0) > font";
  const sum_ot_selector =
    "body > div > div > div > div > div > div > table > tbody > tr:eq(1) > td:eq(1) > font";
  const sum_total_selector =
    "body > div > div > div > div > div > div > table > tbody > tr:eq(1) > td:eq(2) > font";
  const message_selector = "body > div > div > table > tbody > tr > td:eq(1)";
  const work_hour_selector =
    "body > div > div > div > table> tbody > tr > td:eq(7) > font";
  const setDem = function(value) {
    if (value === 0) {
      return 2;
    } else if (value < 1) {
      return 1;
    } else if (value < 10) {
      return 2;
    } else {
      return 3;
    }
  };
  if (
    $("[name=drp_ft]").val() == 7.5 &&
    Number($(work_hour_selector).text()) != 0
  ) {
    $("[name=drp_ft]").val(Number($(work_hour_selector).text()).toFixed(1));
  }
  const parseTime = function(value, is_start) {
    if (typeof value === undefined || value === "zero") {
      return 0;
    }
    let hour = Number(value.split(":")[0]);
    const min = Number(value.split(":")[1]);
    if (hour <= 7 && !is_start) {
      hour += 24;
    }
    return hour + min / 60;
  };
  $("[name^=drp_]").change(function() {
    let work_hour = 0;
    let ft_hour = 0;
    let mid_hour = 0;
    let hol_hour = 0;
    let nonft_hour = 0;
    let sum_st = 0;
    let sum_ot = 0;
    let sum_total = 0;
    let mh_total = 0;
    let is_st_ok = false;
    let is_all_hours_same = false;
    let is_all_not_zero = false;
    let is_err = false;
    let is_flex = false;

    for (let i = 1; i <= 60; i++) {
      if (i < 10) {
        sum_st += Number($("[name=drp_st0" + i + "]").val());
      } else {
        sum_st += Number($("[name=drp_st" + i + "]").val());
      }
    }
    for (let i = 1; i <= 60; i++) {
      if (i < 10) {
        sum_ot += Number($("[name=drp_ot0" + i + "]").val());
      } else {
        sum_ot += Number($("[name=drp_ot" + i + "]").val());
      }
    }
    sum_total = sum_st + sum_ot;
    $(sum_st_selector).text(sum_st.toPrecision(setDem(sum_st)));
    $(sum_ot_selector).text(sum_ot.toPrecision(setDem(sum_ot)));
    $(sum_total_selector).text(sum_total.toPrecision(setDem(sum_total)));

    work_hour =
      parseTime($("[name=drp_FTime]").val(), false) -
      parseTime($("[name=drp_STime]").val(), true) -
      Number($("[name=drp_rhours]").val());
    if (work_hour < 0) {
      work_hour = 0;
    }
    $(work_hour_selector).text(work_hour.toPrecision(setDem(work_hour)));
    mid_hour = Number($("[name=drp_midnight]").val());
    hol_hour = Number($("[name=drp_htime]").val());
    nonft_hour = Number($("[name=drp_nonft]").val());
    ft_hour = Number($("[name=drp_ft]").val());
    mh_total = ft_hour + mid_hour + hol_hour + nonft_hour;
    is_st_ok = sum_st <= 7.5;
    if ($("[name=drp_ft]").attr("type") == "hidden") {
      is_flex = false;
      is_all_hours_same = work_hour === sum_total;
    } else {
      is_flex = true;
      is_all_hours_same = work_hour === sum_total && work_hour === mh_total;
    }
    is_all_not_zero = work_hour > 0 && sum_total > 0 && mh_total > 0;
    $(message_selector).css({ "font-size": "10pt" });
    if (!is_st_ok && !is_all_hours_same && is_all_not_zero) {
      $(sum_st_selector).css({ color: "red" });
      $(message_selector).text("");
      if (is_flex) {
        $(message_selector).append(
          "Warning: 1. ST shall be less than or equal to 7.5 hours. <br/>2. WORKING HOURS, (FT HOURS+MIDNIGHT+HOLIDAY), and ST+OT shall be same."
        );
      } else {
        $(message_selector).append(
          "Warning: 1. ST shall be less than or equal to 7.5 hours. <br/>2. WORKING HOURS and ST+OT shall be same."
        );
      }
      is_err = true;
    } else if (!is_st_ok) {
      $(sum_st_selector).css({ color: "red" });
      $(message_selector).text(
        "Warning: ST shall be less than or equal to 7.5 hours."
      );
      is_err = true;
    } else if (!is_all_hours_same && is_all_not_zero) {
      if (is_flex) {
        $(message_selector).text(
          "Warning: WORKING HOURS, (FT HOURS+MIDNIGHT+HOLIDAY), and ST+OT shall be same."
        );
      } else {
        $(message_selector).text(
          "Warning: WORKING HOURS and ST+OT shall be same."
        );
      }
      is_err = true;
    }
    if (is_st_ok) {
      $(sum_st_selector).css({ color: "black" });
    }
    if (!is_err) {
      $(message_selector).text("");
    }
  });
  $(
    "[name=drp_nonft],[name=drp_midnight],[name=drp_htime],[name=drp_STime],[name=drp_FTime],[name=drp_rhours]"
  ).change(function() {
    const isholiday =
      !$("[name=drp_work]")
        .val()
        .indexOf("80") ||
      !$("[name=drp_work]")
        .val()
        .indexOf("9");
    const work_hour =
      parseTime($("[name=drp_FTime]").val(), false) -
      parseTime($("[name=drp_STime]").val(), true) -
      Number($("[name=drp_rhours]").val());
    const mid_hour = Number($("[name=drp_midnight]").val());
    const hol_hour = Number($("[name=drp_htime]").val());
    const nonft_hour = Number($("[name=drp_nonft]").val());
    const ft_hour = work_hour - mid_hour - hol_hour - nonft_hour;
    if (isholiday) {
      $("[name=drp_htime]").val((ft_hour + hol_hour).toFixed(1));
      if (
        ft_hour + hol_hour >= 4 &&
        !$("[name=drp_work]")
          .val()
          .indexOf("80")
      ) {
        $("[name=drp_work]").prop("selectedIndex", 9);
      }
      if (
        ft_hour + hol_hour < 4 &&
        !$("[name=drp_work]")
          .val()
          .indexOf("9")
      ) {
        $("[name=drp_work]").prop("selectedIndex", 8);
      }
    } else {
      $("[name=drp_ft]").val(ft_hour.toFixed(1));
    }
    // if (
    //   ft_hour != 0 &&
    //   !$("[name=drp_work]")
    //     .val()
    //     .indexOf("80")
    // ) {
    //   $(message_selector).text(
    //     "Change working status to holiday work ("+status_holiday_work+") before submit"
    //   );
    // }
    if ($("[name=drp_ft]").attr("type") === "hidden") {
      $("[name=drp_ft]").val(0);
    }
  });
  $("[id^=sb]").on("click", function() {
    const isholiday =
      !$("[name=drp_work]")
        .val()
        .indexOf("80") ||
      !$("[name=drp_work]")
        .val()
        .indexOf("9");
    const work_hour = $(work_hour_selector).text();
    const sum_st = $(sum_st_selector).text();
    const sum_ot = $(sum_ot_selector).text();
    const index_row = $(this)
      .attr("id")
      .substr(-2);
    const st_selector = "[name=drp_st" + index_row + "]";
    const ot_selector = "[name=drp_ot" + index_row + "]";
    const current_st = Number($(st_selector).val());
    const current_ot = Number($(ot_selector).val());
    let st_rest = 7.5;
    if (work_hour == 0) {
      $(message_selector).text("Set WORKING HOURS first");
    } else {
      if (work_hour < 7.5) {
        st_rest = work_hour;
      }
      const st_input = st_rest - sum_st + current_st;
      const ot_input = work_hour - st_rest - sum_ot + current_ot;
      if (isholiday) {
        $(ot_selector).val((st_input + ot_input).toFixed(1));
        console.log("st_input " + st_input.toFixed(1));
        console.log("ot_input " + ot_input.toFixed(1));
        $(ot_selector).trigger("change");
      } else {
        $(st_selector).val(st_input.toFixed(1));
        $(ot_selector).val(ot_input.toFixed(1));
        $(st_selector).trigger("change");
      }
      if ($(message_selector).text() == "") {
        $(message_selector).text("Balance work hours are inputted.");
      }
      if ($(st_selector).val() == "") {
        $(st_selector).val("0.0");
      }
      if ($(ot_selector).val() == "") {
        $(ot_selector).val("0.0");
      }
    }
  });
}

// load jQuery and execute the main function
addJQuery(main);
